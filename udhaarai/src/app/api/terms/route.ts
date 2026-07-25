import { NextResponse } from "next/server";
import { createClient, getUser } from "@/lib/supabase/server";
import { checkOrigin, fail } from "@/lib/security";

export const runtime = "nodejs";

/** Records acceptance with a timestamp — the thing that matters if it's ever queried. */
export async function POST(request: Request) {
  const csrf = checkOrigin(request);
  if (csrf) return csrf;

  const user = await getUser();
  if (!user) return fail("Sign in first.", 401);

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("profiles")
    .update({ terms_accepted_at: now, terms_version: "1.0" })
    .eq("id", user.id);

  if (error) return fail("Could not record your acceptance.", 500, error);

  await supabase.from("audit_logs").insert({
    owner_id: user.id,
    action: "terms_accepted",
    detail: { version: "1.0", at: now },
  });

  return NextResponse.json({ ok: true });
}
