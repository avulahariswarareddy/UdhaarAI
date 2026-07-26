import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { checkOrigin, fail } from "@/lib/security";
import { sanitizeText } from "@/lib/utils";
import { checkPhone } from "@/lib/verify/phone";

export const runtime = "nodejs";

const PatchBody = z.object({
  name: z.string().min(1).max(120).optional(),
  phone: z.string().max(20).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  language: z.enum(["en", "hi", "te"]).optional(),
  notes: z.string().max(300).nullable().optional(),
  creditLimit: z.number().min(0).max(10_000_000).nullable().optional(),
});

/** Edit a customer's own fields. Never touches balance — that's transactions. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrf = checkOrigin(request);
  if (csrf) return csrf;
  const user = await getUser();
  if (!user) return fail("Sign in first.", 401);

  const { id } = await params;
  const parsed = PatchBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Nothing valid to save.", 400);

  const update: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) {
    const name = sanitizeText(parsed.data.name, 120);
    if (!name) return fail("A customer needs a name.", 400);
    update.name = name;
  }
  if (parsed.data.phone !== undefined) {
    if (parsed.data.phone === null || !parsed.data.phone.trim()) {
      update.phone = null;
    } else {
      const check = checkPhone(parsed.data.phone);
      if (!check.valid) return fail(`That phone number isn't valid — ${check.reason}.`, 400);
      update.phone = check.normalised ?? null;
    }
  }
  if (parsed.data.address !== undefined) update.address = sanitizeText(parsed.data.address ?? "", 300) || null;
  if (parsed.data.language !== undefined) update.language = parsed.data.language;
  if (parsed.data.notes !== undefined) update.notes = sanitizeText(parsed.data.notes ?? "", 300) || null;
  if (parsed.data.creditLimit !== undefined) update.credit_limit = parsed.data.creditLimit;

  if (Object.keys(update).length === 0) return fail("Nothing to update.", 400);

  const supabase = await createClient();
  // RLS scopes this to the signed-in shopkeeper's own rows.
  const { data, error } = await supabase
    .from("customers")
    .update(update)
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id, name")
    .maybeSingle();

  if (error) return fail("Could not save those changes.", 500, error);
  if (!data) return fail("Customer not found.", 404);
  return NextResponse.json({ ok: true, customer: data });
}

/** Delete a customer. Cascades to their transactions and reminders. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrf = checkOrigin(request);
  if (csrf) return csrf;
  const user = await getUser();
  if (!user) return fail("Sign in first.", 401);

  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) return fail("Could not delete that customer.", 500, error);
  if (!data) return fail("Customer not found.", 404);
  return NextResponse.json({ ok: true });
}
