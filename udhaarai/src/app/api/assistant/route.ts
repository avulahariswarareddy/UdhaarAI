import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { answerAboutLedger } from "@/lib/gemini";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({ question: z.string().min(2).max(400) });

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "assistant"), 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Slow down a moment." }, { status: 429 });
  }

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
  }

  const supabase = await createClient();

  // RLS already scopes these to the caller. Send the model only what it needs.
  const [{ data: balances }, { data: recent }, { data: analytics }, { data: expenses }] = await Promise.all([
    supabase.rpc("customer_balances"),
    supabase
      .from("transactions")
      .select("entry_date, raw_date_text, items, credit, payment, payment_method, customers(name)")
      .order("created_at", { ascending: false })
      .limit(120),
    supabase.rpc("business_analytics"),
    supabase
      .from("expenses")
      .select("category, amount, spent_at")
      .order("spent_at", { ascending: false })
      .limit(80),
  ]);

  const ledger = JSON.stringify({
    today: new Date().toISOString().slice(0, 10),
    business_totals: analytics ?? {},
    customers: balances ?? [],
    recent_entries: (recent ?? []).map((t: Record<string, unknown>) => ({
      customer: (t.customers as { name?: string } | null)?.name ?? null,
      date: t.entry_date ?? t.raw_date_text,
      items: t.items,
      credit: t.credit,
      payment: t.payment,
      paid_via: t.payment_method,
    })),
    recent_expenses: (expenses ?? []).map((e: Record<string, unknown>) => ({
      category: e.category, amount: e.amount, date: e.spent_at,
    })),
  });

  try {
    const answer = await answerAboutLedger(parsed.data.question, ledger);
    return NextResponse.json({ answer });
  } catch (e) {
    console.error("[assistant]", e);
    return NextResponse.json(
      { error: "The assistant is unavailable right now. Try again shortly." },
      { status: 502 }
    );
  }
}
