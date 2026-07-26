"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Loader2, Check } from "lucide-react";

export type CustomerFormValues = {
  id?: string;
  name: string;
  phone: string;
  address: string;
  language: "en" | "hi" | "te";
  notes: string;
  creditLimit: string; // kept as text in the form, parsed on submit
};

const LANGS: { value: "en" | "hi" | "te"; label: string }[] = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "te", label: "Telugu" },
];

const FIELD_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-brand/60";

/** Shared Add/Edit customer modal. Edit mode is triggered by passing `initial` with an id. */
export function CustomerFormModal({
  initial, onClose,
}: {
  initial?: Partial<CustomerFormValues> & { id?: string };
  onClose: () => void;
}) {
  const router = useRouter();
  const isEdit = !!initial?.id;
  const [values, setValues] = useState<CustomerFormValues>({
    name: initial?.name ?? "",
    phone: initial?.phone ?? "",
    address: initial?.address ?? "",
    language: initial?.language ?? "en",
    notes: initial?.notes ?? "",
    creditLimit: initial?.creditLimit ?? "",
  });
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof CustomerFormValues>(k: K, v: CustomerFormValues[K]) =>
    setValues((s) => ({ ...s, [k]: v }));

  async function save() {
    const name = values.name.trim();
    if (!name) return toast.error("A customer needs a name.");
    const creditLimit = values.creditLimit.trim() ? Number(values.creditLimit) : null;
    if (creditLimit !== null && (!Number.isFinite(creditLimit) || creditLimit < 0)) {
      return toast.error("Credit limit must be a positive number.");
    }

    setBusy(true);
    try {
      const res = await fetch(isEdit ? `/api/customer/${initial!.id}` : "/api/customer", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, phone: values.phone.trim(), address: values.address.trim(),
          language: values.language, notes: values.notes.trim(), creditLimit,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not save that customer.");
      toast.success(isEdit ? "Customer updated." : `Added ${name}.`);
      router.refresh();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog" aria-modal="true"
        className="glass w-full max-w-md rounded-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{isEdit ? "Edit customer" : "Add customer"}</h2>
          <button onClick={onClose} aria-label="Close" className="cursor-pointer rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3.5">
          <Field label="Name">
            <input value={values.name} onChange={(e) => set("name", e.target.value)}
              placeholder="Ramesh Kirana" className={FIELD_CLASS} autoFocus />
          </Field>
          <Field label="Phone (optional)">
            <input value={values.phone} onChange={(e) => set("phone", e.target.value)}
              placeholder="98765 43210" className={FIELD_CLASS} />
          </Field>
          <Field label="Address (optional)">
            <input value={values.address} onChange={(e) => set("address", e.target.value)}
              placeholder="Shop no. 4, Main Road" className={FIELD_CLASS} />
          </Field>
          <Field label="Preferred language">
            <div className="flex gap-1.5">
              {LANGS.map((l) => (
                <button key={l.value} type="button" onClick={() => set("language", l.value)}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-[13px] transition ${
                    values.language === l.value ? "bg-brand font-semibold text-navy" : "border border-white/12 bg-white/5 text-white/70"}`}>
                  {l.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Credit limit (optional)">
            <input value={values.creditLimit} inputMode="decimal"
              onChange={(e) => set("creditLimit", e.target.value.replace(/[^\d.]/g, ""))}
              placeholder="e.g. 5000" className={FIELD_CLASS} />
          </Field>
          <Field label="Notes (optional)">
            <textarea value={values.notes} onChange={(e) => set("notes", e.target.value)}
              rows={2} placeholder="Anything worth remembering" className={`${FIELD_CLASS} resize-none`} />
          </Field>
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={save} disabled={busy || !values.name.trim()}
            className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-navy transition hover:bg-brand-light disabled:opacity-40">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {isEdit ? "Save changes" : "Add customer"}
          </button>
          <button onClick={onClose}
            className="cursor-pointer rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block font-mono text-[10px] tracking-widest text-white/45">{label.toUpperCase()}</label>
      {children}
    </div>
  );
}
