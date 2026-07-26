import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { parseIntent, describeIntent } from "@/lib/verify/intent";
import { findMatches, ASK_ADMIN } from "@/lib/verify/names";
import { checkOrigin, fail } from "@/lib/security";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * AI Action Note — turn a natural sentence into a proposed action.
 *
 * This endpoint NEVER executes anything. It returns a structured proposal
 * that the client shows for confirmation (Yes / Edit / Cancel). Sensitive
 * actions — moving money — always come back needing confirmation. Execution
 * happens through the existing, separately-audited /api/payment, /api/expense
 * and /api/customer routes once the admin taps Yes.
 *
 * The deterministic parser handles the common cases instantly. When it isn't
 * confident, the note is passed to the ledger assistant instead of guessed.
 */
const Body = z.object({ text: z.string().min(1).max(400) });

export async function POST(request: Request) {
  const csrf = checkOrigin(request);
  if (csrf) return csrf;

  const limit = rateLimit(`note:${(await getUser())?.id ?? "anon"}`, 30, 60_000);
  if (!limit.ok) return fail("Slow down a moment.", 429);

  const user = await getUser();
  if (!user) return fail("Sign in first.", 401);

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Type what you'd like to do.", 400);

  const intent = parseIntent(parsed.data.text);
  const supabase = await createClient();

  // For actions that name a customer, try to resolve them against the roster
  // so the confirmation can say "did you mean this Ramesh?" rather than
  // blindly creating a duplicate.
  let customerMatches: { id: string; name: string; score: number; outstanding?: number }[] = [];
  if (intent.slots.customerName &&
      (intent.kind === "record_payment" || intent.kind === "find_customer" || intent.kind === "generate_reminder")) {
    const { data: customers } = await supabase
      .from("customers").select("id, name").limit(500);
    if (customers?.length) {
      customerMatches = findMatches(intent.slots.customerName, customers)
        .filter((m) => m.score >= ASK_ADMIN)
        .slice(0, 3);
    }
  }

  // A payment amount that exceeds the outstanding balance needs a heads-up
  // before confirmation, not a silent overpayment — same rule QuickPayment
  // applies. Only worth the query for the one match the confirmation acts on.
  if (intent.kind === "record_payment" && customerMatches[0]) {
    const { data: txs } = await supabase
      .from("transactions").select("credit, payment").eq("customer_id", customerMatches[0].id);
    customerMatches[0].outstanding = (txs ?? []).reduce((s, t) => s + Number(t.credit) - Number(t.payment), 0);
  }

  // If the parser is unsure, defer to the LLM-backed assistant rather than
  // acting on a low-confidence guess.
  const needsFallback = intent.kind === "unknown" || intent.confidence < 0.55;

  return NextResponse.json({
    intent: {
      kind: intent.kind,
      lang: intent.lang,
      confidence: intent.confidence,
      slots: intent.slots,
      missing: intent.missing,
    },
    summary: describeIntent(intent),
    customerMatches,
    // Money movements always need an explicit yes.
    requiresConfirmation: intent.kind === "record_payment" || intent.kind === "record_expense",
    fallbackToAssistant: needsFallback,
  });
}
