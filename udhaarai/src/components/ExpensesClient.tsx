"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Receipt, TrendingDown } from "lucide-react";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, expenseCategoryBreakdown } from "@/lib/verify/analytics";
import { rupee } from "@/lib/utils";

type Expense = {
  id: string; category: string; amount: number;
  payment_method: string | null; spent_at: string; notes: string | null;
};

export function ExpensesClient({ initial }: { initial: Expense[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [category, setCategory] = useState<string>("Rent");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("Cash");
  const [spentAt, setSpentAt] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");

  const thisMonth = useMemo(() => {
    const m = new Date(); m.setDate(1); m.setHours(0, 0, 0, 0);
    return rows.filter((r) => new Date(r.spent_at) >= m).reduce((s, r) => s + Number(r.amount), 0);
  }, [rows]);

  const byCategory = useMemo(
    () => expenseCategoryBreakdown(rows.map((r) => ({ ...r, spent_at: r.spent_at, created_at: r.spent_at }))),
    [rows]
  );

  async function add() {
    const value = Number(amount) || 0;
    if (value <= 0) return toast.error("Enter an amount.");
    setBusy(true);
    const res = await fetch("/api/expense", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, amount: value, method, spentAt, note }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return toast.error(j.error ?? "Could not save that.");
    }
    toast.success("Expense added.");
    setOpen(false); setAmount(""); setNote("");
    router.refresh();
    setRows((r) => [{ id: crypto.randomUUID(), category, amount: value, payment_method: method, spent_at: spentAt, notes: note }, ...r]);
  }

  async function remove(id: string) {
    setRows((r) => r.filter((x) => x.id !== id));
    await fetch(`/api/expense?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Expenses</h1>
          <p className="mt-1 text-sm text-white/50">
            {rupee(thisMonth)} spent this month across {rows.length} entries
          </p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-navy transition hover:bg-brand-light"
        >
          <Plus size={15} /> Add expense
        </button>
      </div>

      {open && (
        <div className="liquid mb-5 rounded-2xl p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block font-mono text-[10px] tracking-widest text-white/45">CATEGORY</label>
              <div className="flex flex-wrap gap-1.5">
                {EXPENSE_CATEGORIES.map((c) => (
                  <button key={c} onClick={() => setCategory(c)}
                    className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-[13px] transition ${
                      category === c ? "bg-brand font-semibold text-navy" : "border border-white/12 bg-white/5 text-white/70 hover:bg-white/10"}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] tracking-widest text-white/45">AMOUNT</label>
              <input value={amount} inputMode="decimal"
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="0"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 font-mono outline-none focus:border-brand/60" />
              <div className="mt-3">
                <label className="mb-2 block font-mono text-[10px] tracking-widest text-white/45">DATE</label>
                <input type="date" value={spentAt} onChange={(e) => setSpentAt(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-brand/60 [color-scheme:dark]" />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-2 block font-mono text-[10px] tracking-widest text-white/45">PAID BY</label>
            <div className="flex flex-wrap gap-1.5">
              {PAYMENT_METHODS.map((m) => (
                <button key={m} onClick={() => setMethod(m)}
                  className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-[13px] transition ${
                    method === m ? "bg-white/15 font-semibold" : "border border-white/12 bg-white/5 text-white/70 hover:bg-white/10"}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)"
            className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-brand/60" />
          <button onClick={add} disabled={busy}
            className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-good px-5 py-2.5 font-semibold text-[#04210F] transition hover:brightness-110 disabled:opacity-40">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Save expense
          </button>
        </div>
      )}

      {byCategory.length > 0 && (
        <div className="liquid mb-5 rounded-2xl p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
            <TrendingDown size={17} className="text-brand" /> Where it goes
          </h2>
          <div className="space-y-2">
            {byCategory.slice(0, 6).map((c) => {
              const pct = Math.round((c.total / byCategory.reduce((s, x) => s + x.total, 0)) * 100);
              return (
                <div key={c.category}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-white/70">{c.category}</span>
                    <span className="font-mono text-white/50">{rupee(c.total)} · {pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/8">
                    <div className="h-full rounded-full bg-brand transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="liquid rounded-2xl p-10 text-center">
          <Receipt size={24} className="mx-auto mb-3 text-brand" />
          <p className="font-display text-lg font-bold">No expenses yet</p>
          <p className="mt-1 text-sm text-white/45">Add rent, electricity, stock and the rest to see your real profit.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((e) => (
            <div key={e.id} className="liquid flex items-center justify-between gap-3 rounded-xl p-3.5">
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-brand/12 px-2.5 py-1 text-[12px] font-medium text-brand">{e.category}</span>
                <div>
                  <div className="text-sm">{e.notes || e.category}</div>
                  <div className="text-xs text-white/40">
                    {new Date(e.spent_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    {e.payment_method && ` · ${e.payment_method}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-brand">−{rupee(e.amount)}</span>
                <button onClick={() => remove(e.id)} aria-label="Delete expense"
                  className="cursor-pointer rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
