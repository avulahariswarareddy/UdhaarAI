import { getUser, createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * CSV escaping with formula-injection protection.
 *
 * Customer names come out of OCR of arbitrary pages, so a cell can begin
 * with = + - @ TAB or CR. Excel, LibreOffice and Sheets all execute those
 * as formulas on open — the classic CSV injection. Prefixing with a single
 * quote neutralises it while still displaying the original text.
 */
function csvCell(v: unknown) {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const user = await getUser();
  if (!user) return new Response("Sign in first.", { status: 401 });

  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("entry_date, raw_date_text, items, credit, payment, notes, customers(name, phone)")
    .order("created_at", { ascending: false });

  const header = ["Date", "Customer", "Phone", "Items", "Credit", "Paid", "Notes"];
  const rows = (data ?? []).map((t: Record<string, unknown>) => {
    const c = t.customers as { name?: string; phone?: string } | null;
    return [t.entry_date ?? t.raw_date_text, c?.name, c?.phone, t.items, t.credit, t.payment, t.notes]
      .map(csvCell)
      .join(",");
  });

  return new Response([header.join(","), ...rows].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="udhaarai-ledger-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
