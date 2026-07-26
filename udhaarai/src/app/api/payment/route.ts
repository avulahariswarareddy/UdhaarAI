import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkOrigin, fail } from "@/lib/security";
import { sanitizeText } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/lib/verify/analytics";

export const runtime = "nodejs";

const Body = z.object({
  customerId: z.string().uuid(),
  amount: z.number().positive().max(1_000_000),
  method: z.enum(PAYMENT_METHODS),
  note: z.string().max(300).optional().default(""),
});

/**
 * Records a payment with direct inserts instead of the record_payment()
 * database function. That function is `security invoker` and ends by
 * inserting an audit row — but audit_logs' RLS policy is deliberately
 * select-only for user sessions ("insert-only from the server"), so the
 * audit insert raised 42501 and rolled the entire payment back. Every
 * payment failed on this, from either UI path. Here the transaction is
 * written under the caller's own session (RLS-checked as usual) and the
 * audit row goes through the service-role client, which is what
 * "server-only inserts" always meant.
 */
export async function POST(request: Request) {
  const csrf = checkOrigin(request);
  if (csrf) return csrf;

  const user = await getUser();
  if (!user) return fail("Sign in first.", 401);

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Enter a valid amount and method.", 400);

  const supabase = await createClient();

  // The customer must belong to the caller — RLS enforces it on the insert
  // too, but checking first gives an honest error instead of a generic one.
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("id", parsed.data.customerId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!customer) return fail("That customer wasn't found.", 404);

  const amount = Math.round(parsed.data.amount * 100) / 100;
  const { data: tx, error } = await supabase
    .from("transactions")
    .insert({
      owner_id: user.id,
      customer_id: parsed.data.customerId,
      entry_date: new Date().toISOString().slice(0, 10),
      credit: 0,
      payment: amount,
      payment_method: parsed.data.method,
      notes: sanitizeText(parsed.data.note, 300) || "Paid at counter",
      verified: true,
    })
    .select("id")
    .single();

  if (error || !tx) return fail("Could not record that payment.", 500, error);

  // Audit trail is telemetry, not part of the payment: best-effort, and a
  // failure here must never take down a payment that already saved.
  try {
    const admin = createAdminClient();
    await admin.from("audit_logs").insert({
      owner_id: user.id,
      action: "payment_recorded",
      detail: { customer_id: parsed.data.customerId, amount, method: parsed.data.method },
    });
  } catch (e) {
    console.error("[payment-audit]", e);
  }

  return NextResponse.json({ ok: true, transactionId: tx.id });
}
