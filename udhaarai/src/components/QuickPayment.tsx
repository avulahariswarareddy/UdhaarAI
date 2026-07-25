"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Check, IndianRupee } from "lucide-react";
import { PAYMENT_METHODS } from "@/lib/verify/analytics";
import { rupee } from "@/lib/utils";

/**
 * Record a payment against a customer whose balance is already on screen.
 * The searchable "which customer" selector lives in RecordPaymentDialog;
 * this is the amount-and-method step once the customer is known.
 */
export function QuickPayment({
  customerId, outstanding,
}: { customerId: string; outstanding: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("Cash");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const value = Number(amount) || 0;
  const over = value > outstanding && outstanding > 0;

  async function save() {
    if (value <= 0) return toast.error("Enter an amount first.");
    setBusy(true);
    const res = await fetch("/api/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, amount: value, method, note }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) return toast.error(json.error ?? "Could not record that payment.");
    toast.success(`${rupee(value)} recorded. Receipt is ready to download.`);
    setAmount(""); setNote(""); setMethod("Cash");
    router.refresh();
  }

  return (
    <div className="liquid rounded-2xl p-5">
      <h2 className="font-display text-lg font-bold">Record a payment</h2>
      {outstanding > 0 ? (
        <p className="mt-1 text-sm text-white/50">Outstanding right now: {rupee(outstanding)}</p>
      ) : (
        <p className="mt-1 text-sm text-good">This customer is settled — you can still log an advance.</p>
      )}

      <div className="mt-4">
        <label className="mb-2 block font-mono text-[10px] tracking-widest text-white/45">AMOUNT</label>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 focus-within:border-brand/60">
          <IndianRupee size={16} className="text-white/40" />
          <input
            value={amount}
            inputMode="decimal"
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="0"
            className="w-full bg-transparent py-3 font-mono text-lg outline-none"
          />
        </div>
        {over && (
          <p className="mt-1.5 text-[12px] text-brand">
            That&apos;s more than the outstanding {rupee(outstanding)} — logging it as an advance.
          </p>
        )}
        {outstanding > 0 && (
          <button
            onClick={() => setAmount(String(outstanding))}
            className="mt-2 cursor-pointer rounded-lg bg-white/5 px-2.5 py-1 text-[12px] text-white/60 transition hover:bg-white/10"
          >
            Full balance · {rupee(outstanding)}
          </button>
        )}
      </div>

      <div className="mt-4">
        <label className="mb-2 block font-mono text-[10px] tracking-widest text-white/45">HOW THEY PAID</label>
        <div className="flex flex-wrap gap-1.5">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm transition ${
                method === m
                  ? "bg-brand font-semibold text-navy"
                  : "border border-white/12 bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-2 block font-mono text-[10px] tracking-widest text-white/45">NOTE (OPTIONAL)</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. part payment, will clear next week"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-brand/60"
        />
      </div>

      <button
        onClick={save}
        disabled={busy || value <= 0}
        className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-good px-4 py-3 font-semibold text-[#04210F] transition hover:brightness-110 active:scale-95 disabled:opacity-40"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        Record {value > 0 ? rupee(value) : "payment"}
      </button>
    </div>
  );
}
