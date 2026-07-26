"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, GitMerge, SlidersHorizontal, Loader2, X, AlertTriangle } from "lucide-react";
import { CustomerFormModal, type CustomerFormValues } from "@/components/CustomerFormModal";

type Customer = {
  id: string; name: string; phone: string | null; address: string | null;
  language: "en" | "hi" | "te"; notes: string | null; creditLimit: number | null;
};

export function CustomerActions({
  customer, outstanding, entryCount, otherCustomers,
}: {
  customer: Customer;
  outstanding: number;
  entryCount: number;
  otherCustomers: { id: string; name: string }[];
}) {
  const [modal, setModal] = useState<"edit" | "delete" | "merge" | "balance" | null>(null);

  return (
    <div className="flex flex-wrap gap-2">
      <ActionButton icon={Pencil} label="Edit" onClick={() => setModal("edit")} />
      <ActionButton icon={SlidersHorizontal} label="Adjust balance" onClick={() => setModal("balance")} />
      {otherCustomers.length > 0 && (
        <ActionButton icon={GitMerge} label="Merge duplicate" onClick={() => setModal("merge")} />
      )}
      <ActionButton icon={Trash2} label="Delete" tone="danger" onClick={() => setModal("delete")} />

      {modal === "edit" && (
        <CustomerFormModal
          initial={{
            id: customer.id, name: customer.name, phone: customer.phone ?? "",
            address: customer.address ?? "", language: customer.language,
            notes: customer.notes ?? "",
            creditLimit: customer.creditLimit != null ? String(customer.creditLimit) : "",
          } satisfies Partial<CustomerFormValues> & { id: string }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "delete" && (
        <DeleteModal customer={customer} entryCount={entryCount} onClose={() => setModal(null)} />
      )}
      {modal === "merge" && (
        <MergeModal customer={customer} others={otherCustomers} onClose={() => setModal(null)} />
      )}
      {modal === "balance" && (
        <BalanceModal customer={customer} outstanding={outstanding} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

function ActionButton({
  icon: Icon, label, onClick, tone = "default",
}: { icon: typeof Pencil; label: string; onClick: () => void; tone?: "default" | "danger" }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-[13px] font-medium transition ${
        tone === "danger"
          ? "border-red-500/25 bg-red-500/[0.06] text-red-300 hover:bg-red-500/15"
          : "border-white/12 bg-white/5 text-white/75 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon size={14} /> {label}
    </button>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="glass w-full max-w-md rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="cursor-pointer rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DeleteModal({
  customer, entryCount, onClose,
}: { customer: Customer; entryCount: number; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function confirmDelete() {
    setBusy(true);
    try {
      const res = await fetch(`/api/customer/${customer.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not delete that customer.");
      toast.success(`Deleted ${customer.name}.`);
      router.push("/dashboard/customers");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <ModalShell title="Delete customer" onClose={onClose}>
      <div className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/[0.06] p-3.5">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-300" />
        <p className="text-sm text-white/80">
          This permanently deletes <span className="font-semibold text-white">{customer.name}</span>
          {entryCount > 0 ? <> and all {entryCount} of their ledger entries.</> : "."} This cannot be undone.
        </p>
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={confirmDelete} disabled={busy}
          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-500/90 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-40">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Delete permanently
        </button>
        <button onClick={onClose} className="cursor-pointer rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10">
          Cancel
        </button>
      </div>
    </ModalShell>
  );
}

function MergeModal({
  customer, others, onClose,
}: { customer: Customer; others: { id: string; name: string }[]; onClose: () => void }) {
  const router = useRouter();
  const [targetId, setTargetId] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirmMerge() {
    if (!targetId) return toast.error("Pick who to merge into.");
    setBusy(true);
    try {
      const res = await fetch("/api/customer/merge", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: customer.id, targetId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not merge those customers.");
      toast.success("Merged. All entries moved over.");
      router.push(`/dashboard/customers/${targetId}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <ModalShell title="Merge duplicate" onClose={onClose}>
      <p className="mb-3 text-sm text-white/60">
        Move every entry from <span className="font-semibold text-white">{customer.name}</span> into another
        customer, then remove this duplicate.
      </p>
      <label className="mb-1.5 block font-mono text-[10px] tracking-widest text-white/45">MERGE INTO</label>
      <select value={targetId} onChange={(e) => setTargetId(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-brand/60">
        <option value="">Choose a customer…</option>
        {others.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <div className="mt-4 flex gap-2">
        <button onClick={confirmMerge} disabled={busy || !targetId}
          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-navy transition hover:bg-brand-light disabled:opacity-40">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <GitMerge size={15} />} Merge
        </button>
        <button onClick={onClose} className="cursor-pointer rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10">
          Cancel
        </button>
      </div>
    </ModalShell>
  );
}

function BalanceModal({
  customer, outstanding, onClose,
}: { customer: Customer; outstanding: number; onClose: () => void }) {
  const router = useRouter();
  const [value, setValue] = useState(String(outstanding));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirmAdjust() {
    const newBalance = Number(value);
    if (!Number.isFinite(newBalance) || newBalance < 0) return toast.error("Enter a valid balance.");
    setBusy(true);
    try {
      const res = await fetch(`/api/customer/${customer.id}/adjust-balance`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newBalance, note }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not adjust the balance.");
      toast.success(json.unchanged ? "Balance already matches." : "Balance adjusted with a correcting entry.");
      router.refresh();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell title="Adjust outstanding balance" onClose={onClose}>
      <p className="mb-3 text-sm text-white/60">
        Current: <span className="font-mono text-white">₹{outstanding.toLocaleString("en-IN")}</span>. This adds one
        correcting entry to the ledger for the difference — it never rewrites past entries.
      </p>
      <label className="mb-1.5 block font-mono text-[10px] tracking-widest text-white/45">NEW BALANCE</label>
      <input value={value} inputMode="decimal" onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ""))}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm outline-none focus:border-brand/60" />
      <label className="mb-1.5 mt-3 block font-mono text-[10px] tracking-widest text-white/45">REASON (OPTIONAL)</label>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. counted cash, was off by ₹50"
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-brand/60" />
      <div className="mt-4 flex gap-2">
        <button onClick={confirmAdjust} disabled={busy}
          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-navy transition hover:bg-brand-light disabled:opacity-40">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <SlidersHorizontal size={15} />} Save
        </button>
        <button onClick={onClose} className="cursor-pointer rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10">
          Cancel
        </button>
      </div>
    </ModalShell>
  );
}
