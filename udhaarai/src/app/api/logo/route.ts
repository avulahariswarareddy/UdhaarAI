import { NextResponse } from "next/server";
import { createClient, getUser } from "@/lib/supabase/server";
import { fail, sniffImageType } from "@/lib/security";

export const runtime = "nodejs";

const MAX = 2 * 1024 * 1024;

/** Upload the shop's logo. Appears on every receipt they download. */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return fail("Sign in first.", 401);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("No image was attached.", 400);
  if (file.size > MAX) return fail("Logo must be under 2 MB.", 413);

  const bytes = new Uint8Array(await file.arrayBuffer());

  // Trust the bytes, not the declared type.
  const sniffed = sniffImageType(bytes);
  if (!sniffed || !/png|jpeg/.test(sniffed)) {
    return fail("Logo must be a PNG or JPG image.", 415);
  }

  const supabase = await createClient();
  const ext = sniffed.includes("png") ? "png" : "jpg";
  const path = `logos/${user.id}/logo-${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("notebooks")
    .upload(path, bytes, { contentType: sniffed, upsert: true });
  if (upErr) return fail("Could not store that logo.", 500, upErr);

  // Remove the previous one so old files don't accumulate.
  const { data: prev } = await supabase
    .from("profiles").select("logo_path").eq("id", user.id).maybeSingle();
  if (prev?.logo_path && prev.logo_path !== path) {
    await supabase.storage.from("notebooks").remove([prev.logo_path]);
  }

  const { error } = await supabase.from("profiles").update({ logo_path: path }).eq("id", user.id);
  if (error) return fail("Could not save that logo.", 500, error);

  return NextResponse.json({ ok: true, path });
}

export async function DELETE() {
  const user = await getUser();
  if (!user) return fail("Sign in first.", 401);

  const supabase = await createClient();
  const { data: prev } = await supabase
    .from("profiles").select("logo_path").eq("id", user.id).maybeSingle();

  if (prev?.logo_path) {
    await supabase.storage.from("notebooks").remove([prev.logo_path]);
  }
  await supabase.from("profiles").update({ logo_path: null }).eq("id", user.id);
  return NextResponse.json({ ok: true });
}
