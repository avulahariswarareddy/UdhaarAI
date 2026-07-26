import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
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

export async function POST(request: Request) {
  const csrf = checkOrigin(request);
  if (csrf) return csrf;

  const user = await getUser();
  if (!user) return fail("Sign in first.", 401);

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Enter a valid amount and method.", 400);

  const supabase = await createClient();
  // record_payment re-checks ownership inside the database.
  const { data, error } = await supabase.rpc("record_payment", {
    p_customer_id: parsed.data.customerId,
    p_amount: parsed.data.amount,
    p_method: parsed.data.method,
    p_note: sanitizeText(parsed.data.note, 300),
  });

  if (error) {
    // TEMPORARY DEBUG — surfacing the raw error to diagnose a live failure.
    // Reverted before this ships for real; do not leave this in.
    return fail(`DEBUG: ${error.message} | code=${error.code} | details=${error.details} | hint=${error.hint}`, 400, error);
  }

  return NextResponse.json({ ok: true, transactionId: data });
}
