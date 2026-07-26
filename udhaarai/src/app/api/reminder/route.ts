import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { writeReminderVariants } from "@/lib/gemini";
import { rateLimit } from "@/lib/rate-limit";
import { checkOrigin, fail } from "@/lib/security";
import { nextFestival } from "@/lib/verify/insights";
import {
  chooseTone, factsToBrief, validateReminder, type ReminderFacts,
} from "@/lib/verify/reminder-context";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({
  customerId: z.string().uuid(),
  language: z.enum(["en", "hi", "te"]).optional(),
});

export async function POST(request: Request) {
  const csrf = checkOrigin(request);
  if (csrf) return csrf;

  const user = await getUser();
  if (!user) return fail("Sign in first.", 401);

  const limit = rateLimit(`reminder:${user.id}`, 20, 60_000);
  if (!limit.ok) return fail("Too many reminders at once. Try again shortly.", 429);

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Which customer?", 400);

  const supabase = await createClient();

  // Ownership enforced by RLS and again by the explicit filter.
  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, phone, notes, language")
    .eq("id", parsed.data.customerId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!customer) return fail("Customer not found.", 404);

  const [{ data: txs }, { data: profile }, { data: priorReminders }] = await Promise.all([
    supabase
      .from("transactions")
      .select("credit, payment, items, created_at")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("business_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("reminders")
      .select("created_at")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const rows = txs ?? [];
  const outstanding = rows.reduce((s, t) => s + Number(t.credit) - Number(t.payment), 0);
  if (outstanding <= 0) return fail("This customer has nothing outstanding.", 400);

  const payments = rows.filter((t) => Number(t.payment) > 0);
  const lastPay = payments[0];
  const firstEntry = rows[rows.length - 1];

  const daysBetween = (iso: string) =>
    Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

  const facts: ReminderFacts = {
    customerName: customer.name,
    shopName: profile?.business_name ?? "our shop",
    outstanding,
    lastPaymentAmount: lastPay ? Number(lastPay.payment) : null,
    lastPaymentDate: lastPay ? (lastPay.created_at as string) : null,
    daysSincePayment: lastPay ? daysBetween(lastPay.created_at as string) : null,
    totalCredit: rows.reduce((s, t) => s + Number(t.credit), 0),
    totalPaid: rows.reduce((s, t) => s + Number(t.payment), 0),
    entryCount: rows.length,
    monthsAsCustomer: firstEntry
      ? Math.max(0, Math.round(daysBetween(firstEntry.created_at as string) / 30))
      : 0,
    recentItems: rows.map((t) => String(t.items ?? "")).filter(Boolean).slice(0, 5),
    customerNote: customer.notes ?? null,
    previousReminders: priorReminders?.length ?? 0,
    daysSinceLastReminder: priorReminders?.[0]
      ? daysBetween(priorReminders[0].created_at as string)
      : null,
    festival: nextFestival(new Date(), 14),
  };

  // The customer's own preferred language wins; the admin's pick is the fallback.
  const language = (customer.language as "en" | "hi" | "te" | null) ?? parsed.data.language ?? "en";
  const { tone, why } = chooseTone(facts);

  try {
    // Up to two attempts: a variant containing a placeholder or missing the
    // customer's name is never shown, it is regenerated.
    let usable: { label: string; body: string }[] = [];
    for (let attempt = 0; attempt < 2 && usable.length === 0; attempt++) {
      const variants = await writeReminderVariants({
        brief: factsToBrief(facts), language, tone, toneReason: why,
      });
      usable = variants.filter((v) => validateReminder(v.body, facts).ok);
      if (usable.length === 0) {
        console.warn("[reminder] all variants rejected", variants.map((v) => validateReminder(v.body, facts).reason));
      }
    }

    if (usable.length === 0) {
      return fail("Couldn't write a good message just now. Try again.", 502);
    }

    // Record that a reminder was drafted, so the next one knows.
    await supabase.from("reminders").insert({
      owner_id: user.id, customer_id: customer.id,
      language, tone, body: usable[0].body,
    });

    return NextResponse.json({
      variants: usable,
      tone, toneReason: why, language,
      phone: customer.phone,
      outstanding,
      context: {
        lastPaymentAmount: facts.lastPaymentAmount,
        lastPaymentDate: facts.lastPaymentDate,
        daysSincePayment: facts.daysSincePayment,
        monthsAsCustomer: facts.monthsAsCustomer,
        previousReminders: facts.previousReminders,
      },
    });
  } catch (e) {
    // TEMPORARY DEBUG — surfacing the real error to diagnose a live 502.
    // Reverted before this ships for real; do not leave this in.
    return fail(`DEBUG: ${e instanceof Error ? e.message : String(e)}`, 502, e);
  }
}
