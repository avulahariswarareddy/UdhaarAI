import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { rupee } from "@/lib/utils";
import { collectionWorklist, ageingBuckets, recoveryOutlook, type CustomerRow } from "@/lib/verify/risk";
import { AgeingBars } from "@/components/AgeingBars";
import { Phone, ArrowRight, Target, TrendingDown } from "lucide-react";

export const dynamic = "force-dynamic";

const BAND_STYLE = {
  stale:   { chip: "bg-red-500/15 text-red-400",    label: "Gone quiet" },
  overdue: { chip: "bg-brand/15 text-brand",        label: "Overdue" },
  due:     { chip: "bg-amber-400/12 text-amber-300", label: "Due" },
  watch:   { chip: "bg-white/8 text-white/50",      label: "Watch" },
} as const;

export default async function CollectionsPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("customer_risk_input");

  const customers = (data ?? []) as CustomerRow[];
  const worklist = collectionWorklist(customers);
  const buckets = ageingBuckets(customers);
  const outlook = recoveryOutlook(customers);

  const totalOutstanding = customers.reduce((s, c) => s + Math.max(0, Number(c.outstanding)), 0);

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Today&apos;s collections</h1>
        <p className="mt-1.5 text-white/55">
          Ordered by how likely each balance is to go bad, not just by size. The reasoning is shown
          for every customer.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="glass rounded-2xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <TrendingDown size={16} className="text-brand" />
            <h2 className="font-display text-lg font-bold">How old the money is</h2>
          </div>
          <AgeingBars buckets={buckets} />
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <Target size={16} className="text-good" />
            <h2 className="font-display text-lg font-bold">Likely recovery</h2>
          </div>
          <p className="text-sm text-white/50">
            Based on how much of the credit you have given has actually come back so far —{" "}
            <span className="font-mono text-white">{Math.round(outlook.rate * 100)}%</span>.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <div className="font-mono text-[10px] tracking-widest text-white/35">LIKELY TO COME BACK</div>
              <div className="mt-1 font-mono text-2xl font-semibold text-good">{rupee(outlook.likely)}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] tracking-widest text-white/35">AT RISK</div>
              <div className="mt-1 font-mono text-2xl font-semibold text-brand">{rupee(outlook.atRisk)}</div>
            </div>
          </div>
          <p className="mt-4 border-t border-white/8 pt-3 text-xs text-white/40">
            This is your own historical rate applied to {rupee(totalOutstanding)} outstanding. It is
            arithmetic, not a prediction — it will shift as you collect.
          </p>
        </div>
      </div>

      <h2 className="mb-4 mt-8 font-display text-xl font-bold">
        Chase these first{" "}
        <span className="font-mono text-sm font-normal text-white/40">({worklist.length})</span>
      </h2>

      {worklist.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="font-display text-lg font-bold">Nothing outstanding</p>
          <p className="mt-1 text-sm text-white/45">Everyone in your ledger is settled up.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {worklist.map(({ customer, risk }) => {
            const style = BAND_STYLE[risk.band];
            return (
              <li key={customer.id} className="glass rounded-2xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/15 font-display text-lg font-extrabold text-brand">
                      {customer.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-base font-bold">{customer.name}</span>
                        <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${style.chip}`}>
                          {style.label}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-white/40">
                        {customer.phone ? <><Phone size={11} /> {customer.phone}</> : "No phone yet"}
                      </div>
                      <p className="mt-2 text-sm text-white/60">{risk.suggestedAction}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-xl font-semibold text-brand">
                      {rupee(customer.outstanding)}
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-white/35">
                      RISK {risk.score}/100
                    </div>
                  </div>
                </div>

                {/* the reasoning, always visible — a score with no explanation
                    is a score nobody acts on */}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-white/8 pt-3">
                  {risk.components.map((c) => (
                    <span key={c.label} className="text-[11px] text-white/40">
                      <span className="text-white/60">{c.label}</span>
                      {c.points > 0 && <span className="font-mono text-brand"> +{c.points}</span>}
                      {" — "}{c.detail}
                    </span>
                  ))}
                </div>

                <div className="mt-3">
                  <Link href={`/dashboard/customers/${customer.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-light">
                    Open ledger and write a reminder <ArrowRight size={14} />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
