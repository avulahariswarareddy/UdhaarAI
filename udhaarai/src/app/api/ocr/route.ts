import { NextResponse } from "next/server";
import { createClient, getUser } from "@/lib/supabase/server";
import { extractLedger, isGeminiQuotaError } from "@/lib/gemini";
import { rateLimit } from "@/lib/rate-limit";
import { checkOrigin, sniffImageType, fail } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const csrf = checkOrigin(request);
  if (csrf) return csrf;

  const user = await getUser();
  if (!user) return fail("Sign in to read a notebook page.", 401);

  // Keyed on the user, not the IP — shops behind CGNAT share an address.
  const limit = rateLimit(`ocr:${user.id}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `That's a lot of pages at once. Try again in ${limit.retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch (e) {
    return fail("That upload was malformed.", 400, e);
  }

  const file = form.get("file");
  const pageHash = String(form.get("hash") ?? "").slice(0, 32).replace(/[^a-f0-9]/g, "");
  if (!(file instanceof File)) return fail("No image was attached.", 400);
  if (file.size > MAX_BYTES) return fail("That image is over 8 MB.", 413);

  const bytes = Buffer.from(await file.arrayBuffer());

  // Never trust the declared MIME type — read the magic bytes.
  const realType = sniffImageType(new Uint8Array(bytes.subarray(0, 16)));
  if (!realType) {
    return fail("That file isn't a readable image.", 415, `declared ${file.type}`);
  }

  const supabase = await createClient();
  const ext = realType.split("/")[1];
  const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("notebooks")
    .upload(path, bytes, { contentType: realType, upsert: false });
  if (upErr) return fail("The image could not be stored. Try again.", 500, upErr);

  const { data: upload, error: rowErr } = await supabase
    .from("uploads")
    .insert({
      owner_id: user.id,
      storage_path: path,
      status: "processing",
      page_hash: pageHash || null,
    })
    .select("id")
    .single();
  if (rowErr || !upload) return fail("Could not start processing that page.", 500, rowErr);

  try {
    const extraction = await extractLedger(bytes.toString("base64"), realType);

    await supabase.from("ocr_results").insert({
      upload_id: upload.id, owner_id: user.id, raw: extraction as never,
    });

    await supabase.from("uploads").update({
      status: extraction.entries.length ? "needs_review" : "failed",
      page_language: extraction.page_language,
      error_message: extraction.entries.length ? null : "No ledger rows found.",
    }).eq("id", upload.id);

    if (!extraction.entries.length) {
      return fail("No ledger rows were found on that page.", 422);
    }

    const { data: signed } = await supabase.storage
      .from("notebooks").createSignedUrl(path, 60 * 60);

    return NextResponse.json({
      uploadId: upload.id,
      imageUrl: signed?.signedUrl ?? null,
      ...extraction,
    });
  } catch (e) {
    await supabase.from("uploads")
      .update({ status: "failed", error_message: "extraction failed" })
      .eq("id", upload.id);
    const msg = isGeminiQuotaError(e)
      ? "The AI is at its usage limit for right now. Try again in a minute."
      : e instanceof Error ? e.message : "The reader is unavailable right now.";
    return fail(msg, 502, e);
  }
}
