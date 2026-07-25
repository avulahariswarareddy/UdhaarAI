import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { checkOrigin, fail } from "@/lib/security";
import { sanitizeText } from "@/lib/utils";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/verify/analytics";

export const runtime = "nodejs";

const Body = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.number().positive().max(10_000_000),
  method: z.enum(PAYMENT_METHODS).optional(),
  spentAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note: z.string().max(300).optional().default(""),
});

export async function POST(request: Request) {
  const csrf = checkOrigin(request);
  if (csrf) return csrf;
  const user = await getUser();
  if (!user) return fail("Sign in first.", 401);

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Enter a category and amount.", 400);

  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert({
    owner_id: user.id,
    category: parsed.data.category,
    amount: parsed.data.amount,
    payment_method: parsed.data.method ?? null,
    spent_at: parsed.data.spentAt ?? new Date().toISOString().slice(0, 10),
    notes: sanitizeText(parsed.data.note, 300),
  });

  if (error) return fail("Could not save that expense.", 500, error);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const csrf = checkOrigin(request);
  if (csrf) return csrf;
  const user = await getUser();
  if (!user) return fail("Sign in first.", 401);

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return fail("Which expense?", 400);

  const supabase = await createClient();
  // RLS scopes the delete to the owner regardless, the filter is belt-and-braces.
  const { error } = await supabase.from("expenses").delete().eq("id", id).eq("owner_id", user.id);
  if (error) return fail("Could not remove that.", 500, error);
  return NextResponse.json({ ok: true });
}
