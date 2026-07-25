import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { buildReceiptPdf } from "@/lib/receipt";
import { fail } from "@/lib/security";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Download a payment receipt as a PDF.
 *
 * Ownership is enforced twice: RLS on every table, and again inside
 * issue_receipt(), which refuses a transaction that is not the caller's.
 * The receipt number is minted in the database so two rapid clicks can't
 * produce two different numbers for one payment.
 */
const Body = z.object({ transactionId: z.string().uuid() });

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return fail("Sign in first.", 401);

  const limit = rateLimit(`receipt:${user.id}`, 30, 60_000);
  if (!limit.ok) return fail("Too many receipts at once. Try again shortly.", 429);

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Which payment?", 400);

  const supabase = await createClient();

  const { data: rows, error } = await supabase.rpc("issue_receipt", {
    p_transaction_id: parsed.data.transactionId,
  });
  if (error || !rows?.length) {
    return fail("That payment could not be found.", 404, error);
  }
  const r = rows[0] as {
    receipt_no: string; amount: number; balance_after: number;
    issued_at: string; customer_name: string; customer_phone: string | null;
  };

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name, business_address, owner_phone, logo_path")
    .eq("id", user.id)
    .maybeSingle();

  // The shop's logo is optional. A missing or unreadable one must never
  // stop a receipt being issued.
  let logo: Uint8Array | null = null;
  let logoMime: string | null = null;
  if (profile?.logo_path) {
    try {
      const { data: file } = await supabase.storage.from("notebooks").download(profile.logo_path);
      if (file) {
        logo = new Uint8Array(await file.arrayBuffer());
        logoMime = file.type;
      }
    } catch {
      logo = null;
    }
  }

  try {
    const pdf = await buildReceiptPdf({
      receiptNo: r.receipt_no,
      date: new Date(r.issued_at),
      business: {
        name: profile?.business_name ?? "My Shop",
        address: profile?.business_address,
        phone: profile?.owner_phone,
        logo,
        logoMime,
      },
      customer: { name: r.customer_name, phone: r.customer_phone },
      amount: Number(r.amount),
      balanceAfter: Number(r.balance_after),
      note: "Payment received with thanks",
    });

    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="receipt-${r.receipt_no}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return fail("The receipt could not be generated.", 500, e);
  }
}
