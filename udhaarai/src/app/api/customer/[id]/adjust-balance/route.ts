import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { checkOrigin, fail } from "@/lib/security";
import { sanitizeText } from "@/lib/utils";

export const runtime = "nodejs";

const Body = z.object({
  newBalance: z.number().min(0).max(10_000_000),
  note: z.string().max(200).optional().default(""),
});

/**
 * Manually reconcile a customer's outstanding balance to a specific figure.
 *
 * The balance itself isn't a stored field — it's credit minus payment summed
 * across every transaction — so "editing" it means inserting one correcting
 * entry for the difference, the same way a real correction would be written
 * into the notebook. Nothing here can rewrite history, only add to it.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrf = checkOrigin(request);
  if (csrf) return csrf;
  const user = await getUser();
  if (!user) return fail("Sign in first.", 401);

  const { id } = await params;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Enter a valid balance.", 400);

  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers").select("id").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (!customer) return fail("Customer not found.", 404);

  const { data: txs, error: sumError } = await supabase
    .from("transactions").select("credit, payment").eq("customer_id", id);
  if (sumError) return fail("Could not read the current balance.", 500, sumError);

  const current = (txs ?? []).reduce((s, t) => s + Number(t.credit) - Number(t.payment), 0);
  const delta = Math.round((parsed.data.newBalance - current) * 100) / 100;

  if (delta === 0) return NextResponse.json({ ok: true, unchanged: true });

  const note = sanitizeText(parsed.data.note, 200) || "Balance manually adjusted";
  const { error } = await supabase.from("transactions").insert({
    owner_id: user.id,
    customer_id: id,
    entry_date: new Date().toISOString().slice(0, 10),
    credit: delta > 0 ? delta : 0,
    payment: delta < 0 ? -delta : 0,
    notes: note,
    verified: true,
  });

  if (error) return fail("Could not adjust the balance.", 500, error);
  return NextResponse.json({ ok: true, delta });
}
