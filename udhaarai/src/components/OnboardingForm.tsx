"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";
import { checkPhone } from "@/lib/verify/phone";

const TYPES = [
  { id: "kirana", label: "Kirana / general store" },
  { id: "medical", label: "Medical store" },
  { id: "dairy", label: "Dairy / milk" },
  { id: "hardware", label: "Hardware" },
  { id: "other", label: "Something else" },
];

type Form = {
  business_name: string;
  business_address: string;
  owner_phone: string;
  business_type: string;
};

export function OnboardingForm({ initial }: { initial: Form }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const phoneCheck = checkPhone(form.owner_phone);
  const nameOk = form.business_name.trim().length >= 2;
  const phoneOk = form.owner_phone.trim() !== "" && phoneCheck.valid;
  const addressOk = form.business_address.trim().length >= 5;
  const canSubmit = nameOk && phoneOk && addressOk;

  async function submit() {
    if (!canSubmit) {
      setTouched({ business_name: true, owner_phone: true, business_address: true });
      return;
    }
    setBusy(true);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, owner_phone: phoneCheck.normalised }),
    });
    setBusy(false);

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return toast.error(j.error ?? "Could not save those details.");
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mt-7 space-y-4">
      <Field
        label="SHOP NAME"
        error={touched.business_name && !nameOk ? "Enter the name customers know the shop by." : null}
      >
        <input
          value={form.business_name}
          onChange={(e) => setForm({ ...form, business_name: e.target.value })}
          onBlur={() => setTouched({ ...touched, business_name: true })}
          placeholder="Vedasri Traders"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-brand/60"
        />
      </Field>

      <Field
        label="YOUR MOBILE NUMBER"
        error={touched.owner_phone && !phoneOk ? (form.owner_phone ? `Not a valid Indian mobile — ${phoneCheck.reason}` : "We need a number to reach you on.") : null}
      >
        <input
          value={form.owner_phone}
          inputMode="numeric"
          onChange={(e) => setForm({ ...form, owner_phone: e.target.value })}
          onBlur={() => setTouched({ ...touched, owner_phone: true })}
          placeholder="98765 43210"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-brand/60"
        />
      </Field>

      <Field
        label="SHOP ADDRESS"
        error={touched.business_address && !addressOk ? "A street and area is enough." : null}
      >
        <input
          value={form.business_address}
          onChange={(e) => setForm({ ...form, business_address: e.target.value })}
          onBlur={() => setTouched({ ...touched, business_address: true })}
          placeholder="Shop 12, Main Road, Gachibowli"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-brand/60"
        />
      </Field>

      <Field label="WHAT KIND OF SHOP">
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setForm({ ...form, business_type: t.id })}
              className={`cursor-pointer rounded-lg px-3.5 py-2 text-sm transition ${
                form.business_type === t.id
                  ? "bg-brand font-semibold text-navy"
                  : "border border-white/12 bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Field>

      <button
        onClick={submit}
        disabled={busy}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3.5 font-semibold text-navy transition hover:bg-brand-light active:scale-95 disabled:opacity-40"
      >
        {busy ? <Loader2 size={17} className="animate-spin" /> : <ArrowRight size={17} />}
        Open my ledger
      </button>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string | null; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 font-mono text-[10px] tracking-widest text-white/45">{label}</div>
      {children}
      {error && <p className="mt-1.5 text-[12px] text-brand">{error}</p>}
    </div>
  );
}
