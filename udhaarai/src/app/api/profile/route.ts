import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { checkOrigin, fail } from "@/lib/security";
import { sanitizeText } from "@/lib/utils";
import { checkPhone } from "@/lib/verify/phone";

export const runtime = "nodejs";

/**
 * Business details captured at onboarding.
 *
 * Every field is re-validated here. The form validates too, but that is for
 * the person's benefit — a client check is a convenience, never a control,
 * because anything holding the anon key can POST directly.
 */
const Body = z.object({
  business_name: z.string().min(2).max(120),
  business_address: z.string().min(5).max(300),
  owner_phone: z.string().min(10).max(15),
  business_type: z.enum(["kirana", "medical", "dairy", "hardware", "other"]),
});

export async function POST(request: Request) {
  const csrf = checkOrigin(request);
  if (csrf) return csrf;

  const user = await getUser();
  if (!user) return fail("Sign in first.", 401);

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("Some details were missing or too long.", 400, parsed.error.flatten());
  }

  const phone = checkPhone(parsed.data.owner_phone);
  if (!phone.valid) {
    return fail(`That mobile number isn't valid — ${phone.reason}.`, 400);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      business_name: sanitizeText(parsed.data.business_name, 120),
      business_address: sanitizeText(parsed.data.business_address, 300),
      owner_phone: phone.normalised,
      business_type: parsed.data.business_type,
      onboarded: true,
    })
    .eq("id", user.id);

  if (error) return fail("Could not save those details.", 500, error);

  await supabase.from("audit_logs").insert({
    owner_id: user.id,
    action: "onboarding_completed",
    detail: { business_type: parsed.data.business_type },
  });

  return NextResponse.json({ ok: true });
}
