import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Stat } from "@/components/Stat";
import { LazyTrendChart } from "@/components/LazyTrendChart";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ActionNote } from "@/components/ActionNote";
import { HealthAndAdvice } from "@/components/HealthAndAdvice";
import { PaymentModeChart } from "@/components/PaymentModeChart";
import { rupee, timeAgo } from "@/lib/utils";
import { Camera, ArrowRight, Download } from "lucide-react";

export const dynamic = "force-dynamic";

type Summary = {
  total_customers: number; outstanding: number;
  today_collection: number; today_credit: number;
  month_collection: number; month_credit: number; entries: number;
};
type Balance = {
  id: string; name: string; phone: string | null;
  outstanding: number; last_entry: string | null; entry_count: number;
};

export default async function Overview() {
  const supabase = await createClient();
  const [{ data: summary }, { data: balances }, { data: trend }, { data: analytics }, { data: riskRows }] = await Promise.all([
    supabase.rpc("dashboard_summary"),
    supabase.rpc("customer_balances"),
    supabase.rpc("daily_trend", { days: 14 }),
    supabase.rpc("business_analytics"),
    supabase.rpc("customer_risk_input"),
  ]);

  const s = (summary ?? {}) as Summary;
  const a = analytics as {
    month_collected: number; month_credit: number; month_expenses: number; today_collected: number;
    payment_modes: { method: string; total: number; count: number }[];
  } | null;
  const top = ((balances ?? []) as Balance[]).filter((b) => b.outstanding > 0).slice(0, 6);

  if (!s.entries) {
    return (
      <div className="glass mt-6 rounded-3xl p-12 text-center">
        <Camera size={30} className="mx-auto mb-4 text-brand" />
        <h1 className="font-display text-2xl font-extrabold">Your ledger is empty</h1>
        <p className="mx-auto mt-2 max-w-sm text-white/55">
          Photograph one page of the notebook. Everything on this screen fills itself in from there.
        </p>
        <Link
          href="/dashboard/upload"
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 font-semibold text-navy transition hover:bg-brand-light"
        >
          Add the first page <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <>
      <DashboardHeader />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/50">{s.entries} entries across {s.total_customers} customers</p>
        <div className="flex gap-2">
          <a href="/api/export" className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10">
            <Download size={15} /> Export CSV
          </a>
          <Link href="/dashboard/upload" className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-navy transition hover:bg-brand-light">
            <Camera size={15} /> Add page
          </Link>
        </div>
      </div>

      <div className="mb-5"><ActionNote /></div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Outstanding" value={s.outstanding} money accent="brand" />
        <Stat label="Collected today" value={s.today_collection} money accent="good" />
        <Stat label="Credit today" value={s.today_credit} money />
        <Stat label="Collected this month" value={s.month_collection} money accent="good" />
        <Stat label="Credit this month" value={s.month_credit} money />
        <Stat label="Customers" value={s.total_customers} />
      </div>

      {a && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Collected this month" value={a.month_collected} money accent="good" />
          <Stat label="Spent this month" value={a.month_expenses} money accent="brand" />
          <Stat label="Kept this month" value={a.month_collected - a.month_expenses} money accent={a.month_collected - a.month_expenses >= 0 ? "good" : "brand"} />
          <Stat label="Collected today" value={a.today_collected} money />
        </div>
      )}

      {a && riskRows && (riskRows as unknown[]).length > 0 && (
        <div className="mt-5">
          <HealthAndAdvice
            customers={riskRows as never}
            monthCollected={a.month_collected}
            monthCredit={(a as { month_credit?: number }).month_credit ?? 0}
            monthExpenses={a.month_expenses}
          />
        </div>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="liquid rounded-2xl p-5">
          <h2 className="font-display text-lg font-bold">Last fourteen days</h2>
          <p className="mb-4 text-sm text-white/45">Credit given against money collected</p>
          <LazyTrendChart data={(trend ?? []) as { day: string; credit: number; payment: number }[]} />
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="font-display text-lg font-bold">Who owes the most</h2>
          <p className="mb-4 text-sm text-white/45">Sorted by balance, oldest activity noted</p>

          {top.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">Everyone is settled up.</p>
          ) : (
            <ul className="space-y-2">
              {top.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/customers/${c.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/5"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/15 font-display text-sm font-bold text-brand">
                        {c.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{c.name}</span>
                        <span className="block text-xs text-white/40">
                          last entry {timeAgo(c.last_entry)}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-sm font-semibold text-brand">
                      {rupee(c.outstanding)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {a?.payment_modes && a.payment_modes.length > 0 && (
        <div className="liquid mt-5 rounded-2xl p-5">
          <h2 className="mb-4 font-display text-lg font-bold">How customers pay</h2>
          <PaymentModeChart modes={a.payment_modes} />
        </div>
      )}
    </>
  );
}
