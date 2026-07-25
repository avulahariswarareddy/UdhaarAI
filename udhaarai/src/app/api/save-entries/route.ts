import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { sanitizeText } from "@/lib/utils";
import { parseAmount } from "@/lib/verify/numerals";
import { checkPhone } from "@/lib/verify/phone";
import { checkDate } from "@/lib/verify/dates";
import { canonical } from "@/lib/verify/names";
import { checkOrigin, fail } from "@/lib/security";

export const runtime = "nodejs";

const RowSchema = z.object({
  customer_name: z.string().min(1).max(120),
  phone: z.string().max(20).optional().default(""),
  date: z.string().max(40).optional().default(""),
  items: z.string().max(500).optional().default(""),
  credit: z.union([z.string(), z.number()]),
  payment: z.union([z.string(), z.number()]),
  notes: z.string().max(500).optional().default(""),
  confidence: z.record(z.number()).optional(),
  mergeIntoCustomerId: z.string().uuid().nullable().optional(),
});

const Body = z.object({
  uploadId: z.string().uuid().nullable().optional(),
  rows: z.array(RowSchema).min(1).max(60),
});

const MAX_SINGLE_AMOUNT = 1_000_000;

export async function POST(request: Request) {
  const csrf = checkOrigin(request);
  if (csrf) return csrf;

  const user = await getUser();
  if (!user) return fail("Sign in first.", 401);

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Some rows were incomplete.", 400, parsed.error.issues);

  const supabase = await createClient();
  const { uploadId, rows } = parsed.data;

  // Ownership: never take the client's word that this upload is theirs.
  if (uploadId) {
    const { data: owned } = await supabase
      .from("uploads").select("id")
      .eq("id", uploadId).eq("owner_id", user.id).maybeSingle();
    if (!owned) return fail("That page is not yours.", 403);
  }

  /* Load the ledger once, so name resolution is one query rather than one
     per row. On a 40-row page that's 40 round trips saved. */
  const { data: existing } = await supabase.from("customers").select("id, name");
  const byCanonical = new Map<string, string>();
  (existing ?? []).forEach((c) => byCanonical.set(canonical(c.name), c.id));

  const inserts: Record<string, unknown>[] = [];
  let merged = 0;
  let skipped = 0;

  for (const row of rows) {
    const name = sanitizeText(row.customer_name, 120);
    if (!name) { skipped++; continue; }

    const credit = Math.min(parseAmount(row.credit) ?? 0, MAX_SINGLE_AMOUNT);
    const payment = Math.min(parseAmount(row.payment) ?? 0, MAX_SINGLE_AMOUNT);

    let customerId: string | null = null;

    /* 1. An explicit merge chosen by the admin on the review screen.
          Verify it belongs to them before honouring it. */
    if (row.mergeIntoCustomerId) {
      const { data: target } = await supabase
        .from("customers").select("id")
        .eq("id", row.mergeIntoCustomerId).eq("owner_id", user.id).maybeSingle();
      if (target) { customerId = target.id; merged++; }
    }

    /* 2. Canonical-form match — catches case and spacing differences that
          an exact unique constraint would treat as a new customer. */
    if (!customerId) customerId = byCanonical.get(canonical(name)) ?? null;

    /* 3. Otherwise create. */
    if (!customerId) {
      const phone = checkPhone(row.phone);
      const { data: created, error } = await supabase
        .from("customers")
        .upsert(
          { owner_id: user.id, name, phone: phone.valid ? phone.normalised || null : null },
          { onConflict: "owner_id,name" }
        )
        .select("id").single();
      if (error || !created) { skipped++; continue; }
      customerId = created.id;
      byCanonical.set(canonical(name), created.id);
    } else {
      // Backfill a phone number if we now have a valid one and didn't before.
      const phone = checkPhone(row.phone);
      if (phone.valid && phone.normalised) {
        await supabase.from("customers")
          .update({ phone: phone.normalised })
          .eq("id", customerId).is("phone", null);
      }
    }

    inserts.push({
      owner_id: user.id,
      customer_id: customerId,
      upload_id: uploadId ?? null,
      entry_date: checkDate(row.date).iso,
      raw_date_text: sanitizeText(row.date, 40),
      items: sanitizeText(row.items, 500),
      credit,
      payment,
      notes: sanitizeText(row.notes, 500),
      confidence: row.confidence ?? null,
      verified: true,
    });
  }

  if (!inserts.length) return fail("Nothing could be saved from that page.", 422);

  // One batch insert. If it fails, nothing is half-written.
  const { error: insertErr, count } = await supabase
    .from("transactions").insert(inserts, { count: "exact" });
  if (insertErr) return fail("Those entries could not be saved.", 500, insertErr);

  if (uploadId) await supabase.from("uploads").update({ status: "saved" }).eq("id", uploadId);

  await supabase.from("audit_logs").insert({
    owner_id: user.id,
    action: "entries_saved",
    detail: { uploadId: uploadId ?? null, saved: count ?? inserts.length, merged, skipped },
  });

  return NextResponse.json({ saved: count ?? inserts.length, merged, skipped });
}
