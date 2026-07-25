import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { checkOrigin, fail } from "@/lib/security";

export const runtime = "nodejs";

/**
 * Account and data deletion.
 *
 * Required by the personal-data audit checklist, and by any reasonable
 * reading of data protection expectations: a person must be able to get
 * their data out AND get it removed.
 *
 * Deletion cascades via foreign keys, plus explicit removal of the stored
 * notebook images, which a table cascade does not cover.
 */
const Body = z.object({ confirm: z.literal("DELETE") });

export async function POST(request: Request) {
  const csrf = checkOrigin(request);
  if (csrf) return csrf;

  const user = await getUser();
  if (!user) return fail("Sign in first.", 401);

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Type DELETE to confirm.", 400);

  const supabase = await createClient();

  // 1. Remove every stored image under this user's folder.
  const { data: files } = await supabase.storage
    .from("notebooks")
    .list(user.id, { limit: 1000 });

  if (files?.length) {
    await supabase.storage
      .from("notebooks")
      .remove(files.map((f) => `${user.id}/${f.name}`));
  }

  // 2. Delete the ledger. RLS scopes each of these to the caller.
  await supabase.from("transactions").delete().eq("owner_id", user.id);
  await supabase.from("reminders").delete().eq("owner_id", user.id);
  await supabase.from("ocr_results").delete().eq("owner_id", user.id);
  await supabase.from("uploads").delete().eq("owner_id", user.id);
  await supabase.from("customers").delete().eq("owner_id", user.id);
  await supabase.from("profiles").delete().eq("id", user.id);

  await supabase.auth.signOut();

  return NextResponse.json({ deleted: true });
}
