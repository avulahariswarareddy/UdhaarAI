import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { checkOrigin, fail } from "@/lib/security";
import { sanitizeText } from "@/lib/utils";
import { checkPhone } from "@/lib/verify/phone";

export const runtime = "nodejs";

const Body = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().max(20).optional().default(""),
  notes: z.string().max(300).optional().default(""),
});

/** Manually add a customer (also the executor for the Action Note "add customer"). */
export async function POST(request: Request) {
  const csrf = checkOrigin(request);
  if (csrf) return csrf;
  const user = await getUser();
  if (!user) return fail("Sign in first.", 401);

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("A customer needs at least a name.", 400);

  const name = sanitizeText(parsed.data.name, 120);
  if (!name) return fail("A customer needs a name.", 400);

  let phone: string | null = null;
  if (parsed.data.phone.trim()) {
    const check = checkPhone(parsed.data.phone);
    if (!check.valid) return fail(`That phone number isn't valid — ${check.reason}.`, 400);
    phone = check.normalised ?? null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .upsert(
      { owner_id: user.id, name, phone, notes: sanitizeText(parsed.data.notes, 300) || null },
      { onConflict: "owner_id,name", ignoreDuplicates: false }
    )
    .select("id, name")
    .single();

  if (error) return fail("Could not add that customer.", 500, error);
  return NextResponse.json({ ok: true, customer: data });
}
