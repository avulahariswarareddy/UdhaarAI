import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { rupee, timeAgo } from "@/lib/utils";
import { Users, Phone, ArrowRight, Camera } from "lucide-react";
import { AddCustomerButton } from "@/components/AddCustomerButton";

export const dynamic = "force-dynamic";

type Balance = {
  id: string; name: string; phone: string | null;
  credit: number; paid: number; outstanding: number;
  last_entry: string | null; entry_count: number;
};

export default async function CustomersPage({
  searchParams,
}: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.rpc("customer_balances");

  const all = (data ?? []) as Balance[];
  const list = q
    ? all.filter(
        (c) =>
          c.name.toLowerCase().includes(q.toLowerCase()) ||
          (c.phone ?? "").includes(q)
      )
    : all;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Customers</h1>
          <p className="mt-1 text-sm text-white/50">
            {all.length} in the ledger · {all.filter((c) => c.outstanding > 0).length} with a balance
          </p>
        </div>
        <div className="flex gap-2">
          <AddCustomerButton />
          <Link
            href="/dashboard/upload"
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-navy transition hover:bg-brand-light"
          >
            <Camera size={15} /> Add page
          </Link>
        </div>
      </div>

      <form className="glass mb-5 flex items-center gap-2 rounded-xl px-4 py-2.5">
        <Users size={16} className="text-white/40" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Find a customer by name or phone"
          className="w-full bg-transparent text-sm outline-none placeholder:text-white/30"
        />
      </form>

      {list.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Users size={26} className="mx-auto mb-3 text-brand" />
          <p className="font-display text-lg font-bold">
            {all.length ? "Nobody matches that." : "No customers yet"}
          </p>
          <p className="mt-1 text-sm text-white/45">
            {all.length ? "Try a different name or number." : "Add a notebook page to fill this in."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((c) => (
            <li key={c.id}>
              <Link
                href={`/dashboard/customers/${c.id}`}
                className="glass flex items-center justify-between gap-4 rounded-2xl p-4 transition hover:brightness-125"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/15 font-display text-lg font-extrabold text-brand">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-display text-base font-bold">{c.name}</div>
                    <div className="flex items-center gap-1.5 text-xs text-white/40">
                      {c.phone ? (
                        <><Phone size={11} /> {c.phone}</>
                      ) : (
                        "No phone on the page"
                      )}
                      <span>·</span>
                      <span>{c.entry_count} entries</span>
                      <span>·</span>
                      <span>{timeAgo(c.last_entry)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3 text-right">
                  <div>
                    <div
                      className={`font-mono text-lg font-semibold ${
                        Number(c.outstanding) > 0 ? "text-brand" : "text-good"
                      }`}
                    >
                      {rupee(c.outstanding)}
                    </div>
                    <div className="text-[11px] text-white/40">
                      {Number(c.outstanding) > 0 ? "outstanding" : "settled"}
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-white/25" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
