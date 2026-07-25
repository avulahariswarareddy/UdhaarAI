import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rupee } from "@/lib/utils";
import { ReminderBox } from "@/components/ReminderBox";
import { QuickPayment } from "@/components/QuickPayment";
import { ReceiptButton } from "@/components/ReceiptButton";
import { ArrowLeft, Phone } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomerPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS scopes this to the signed-in shopkeeper. A guessed id returns nothing.
  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, phone, notes")
    .eq("id", id)
    .maybeSingle();
  if (!customer) notFound();

  const { data: txs } = await supabase
    .from("transactions")
    .select("id, entry_date, raw_date_text, items, credit, payment, notes, created_at")
    .eq("customer_id", id)
    .order("created_at", { ascending: false });

  const rows = txs ?? [];
  const credit = rows.reduce((s, t) => s + Number(t.credit), 0);
  const paid = rows.reduce((s, t) => s + Number(t.payment), 0);
  const outstanding = credit - paid;

  return (
    <>
      <Link
        href="/dashboard/customers"
        className="mb-5 inline-flex items-center gap-2 text-sm text-white/45 hover:text-white"
      >
        <ArrowLeft size={15} /> All customers
      </Link>

      <div className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/15 font-display text-2xl font-extrabold text-brand">
              {customer.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <h1 className="font-display text-2xl font-extrabold tracking-tight">
                {customer.name}
              </h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-white/45">
                {customer.phone ? (
                  <><Phone size={13} /> {customer.phone}</>
                ) : (
                  "No phone number on the pages so far"
                )}
              </p>
            </div>
          </div>

          <div className="text-right">
            <div
              className={`font-mono text-3xl font-semibold ${
                outstanding > 0 ? "text-brand" : "text-good"
              }`}
            >
              {rupee(outstanding)}
            </div>
            <div className="text-xs text-white/40">
              {rupee(credit)} given · {rupee(paid)} collected
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass rounded-2xl p-5">
          <h2 className="mb-4 font-display text-lg font-bold">Every entry</h2>

          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">
              No entries yet for this customer.
            </p>
          ) : (
            <ul className="space-y-1">
              {rows.map((t) => (
                <li
                  key={t.id}
                  className="flex items-start justify-between gap-3 rounded-xl px-3 py-3 transition hover:bg-white/4"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-white/40">
                      {t.entry_date ?? t.raw_date_text ?? "no date written"}
                    </div>
                    <div className="mt-0.5 truncate text-sm">
                      {t.items || t.notes || "—"}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <div className="text-right font-mono text-sm">
                      {Number(t.credit) > 0 && (
                        <div className="text-brand">+{rupee(t.credit)}</div>
                      )}
                      {Number(t.payment) > 0 && (
                        <div className="text-good">−{rupee(t.payment)}</div>
                      )}
                    </div>
                    {Number(t.payment) > 0 && (
                      <ReceiptButton transactionId={t.id as string} compact />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-5">
          <QuickPayment customerId={customer.id} outstanding={outstanding} />
          <ReminderBox
          customerId={customer.id}
          customerName={customer.name}
          phone={customer.phone}
          outstanding={outstanding}
          />
        </div>
      </div>
    </>
  );
}
