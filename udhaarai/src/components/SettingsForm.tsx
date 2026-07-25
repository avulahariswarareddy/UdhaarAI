"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  business_name: string;
  business_address: string;
  preferred_language: "en" | "hi" | "te";
};

export function SettingsForm({ initial }: { initial: Profile }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return toast.error("Sign in again."); }

    const { error } = await supabase
      .from("profiles")
      .update({
        business_name: form.business_name.slice(0, 120),
        business_address: form.business_address.slice(0, 300),
        preferred_language: form.preferred_language,
      })
      .eq("id", user.id);

    setBusy(false);
    if (error) return toast.error("Could not save that.");
    toast.success("Saved");
  }

  return (
    <div className="glass mt-6 space-y-4 rounded-2xl p-5">
      <Field label="SHOP NAME">
        <input
          value={form.business_name}
          onChange={(e) => setForm({ ...form, business_name: e.target.value })}
          placeholder="Vedasri Traders"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-brand/60"
        />
      </Field>

      <Field label="ADDRESS">
        <input
          value={form.business_address}
          onChange={(e) => setForm({ ...form, business_address: e.target.value })}
          placeholder="Shop no, street, area"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-brand/60"
        />
      </Field>

      <Field label="DEFAULT REMINDER LANGUAGE">
        <div className="flex gap-2">
          {([["en", "English"], ["hi", "हिंदी"], ["te", "తెలుగు"]] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setForm({ ...form, preferred_language: id })}
              className={`rounded-lg px-4 py-2 text-sm transition ${
                form.preferred_language === id
                  ? "bg-brand font-semibold text-navy"
                  : "border border-white/12 bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      <button
        onClick={save}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-navy transition hover:bg-brand-light active:scale-95 disabled:opacity-40"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        Save changes
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 font-mono text-[10px] tracking-widest text-white/40">{label}</div>
      {children}
    </div>
  );
}
