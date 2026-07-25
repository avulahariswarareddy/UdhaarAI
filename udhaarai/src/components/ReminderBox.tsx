"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Loader2, Copy, MessageSquare, Send, RefreshCw, Pencil, Check, Info,
} from "lucide-react";
import { rupee } from "@/lib/utils";
import { toWhatsApp } from "@/lib/verify/phone";
import { Guide } from "@/components/Guide";

/**
 * Personalised reminders.
 *
 * Three variants are generated from this customer's real ledger — their last
 * payment, how long they've been a customer, what they bought. The admin
 * picks one, edits it if they want, and WhatsApp opens with it pre-filled.
 * The app never sends anything; the final tap is always the shopkeeper's.
 */

const LANGS = [
  { id: "en", label: "English" },
  { id: "hi", label: "हिंदी" },
  { id: "te", label: "తెలుగు" },
] as const;

const VARIANT_LABEL: Record<string, string> = {
  warm: "Warm", standard: "Standard", brief: "Brief",
};

const TONE_EXPLAIN: Record<string, string> = {
  appreciative: "Thanking them first — they've been with you a while and they pay",
  friendly: "Casual — there's been recent activity on this account",
  gentle: "Soft — they've slipped a little, no need to press",
  professional: "Businesslike — this one has been outstanding a long time",
  festival: "Festival greeting first, balance mentioned at the end",
};

type Variant = { label: string; body: string };
type Result = {
  variants: Variant[];
  tone: string; toneReason: string; language: string;
  phone: string | null; outstanding: number;
  context: {
    lastPaymentAmount: number | null; lastPaymentDate: string | null;
    daysSincePayment: number | null; monthsAsCustomer: number; previousReminders: number;
  };
};

export function ReminderBox({
  customerId, customerName, phone, outstanding,
}: {
  customerId: string; customerName: string;
  phone: string | null; outstanding: number;
}) {
  const [language, setLanguage] = useState<"en" | "hi" | "te">("en");
  const [result, setResult] = useState<Result | null>(null);
  const [chosen, setChosen] = useState(0);
  const [edited, setEdited] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const message = edited ?? result?.variants[chosen]?.body ?? "";
  const wa = toWhatsApp(phone ?? "");
  const waLink = wa && message ? `https://wa.me/${wa}?text=${encodeURIComponent(message)}` : null;

  async function generate(lang = language) {
    setBusy(true);
    setEdited(null);
    setEditing(false);
    try {
      const res = await fetch("/api/reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, language: lang }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not write that reminder.");
      setResult(json);
      setChosen(0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not write that reminder.");
    } finally {
      setBusy(false);
    }
  }

  if (outstanding <= 0) {
    return (
      <div className="liquid rounded-2xl p-5">
        <h2 className="font-display text-lg font-bold">Nothing to collect</h2>
        <p className="mt-2 text-sm text-white/50">
          {customerName} is settled up. Reminders appear here when there&apos;s a balance.
        </p>
      </div>
    );
  }

  return (
    <div className="liquid rounded-2xl p-5">
      <h2 className="font-display text-lg font-bold">Send a reminder</h2>
      <p className="mt-1 text-sm text-white/50">
        {rupee(outstanding)} pending. Written from {customerName.split(" ")[0]}&apos;s own history —
        not a template.
      </p>

      {/* language */}
      <div className="mt-5">
        <div className="mb-2 font-mono text-[10px] tracking-widest text-white/40">LANGUAGE</div>
        <div className="flex flex-wrap gap-2">
          {LANGS.map((l) => (
            <button
              key={l.id}
              onClick={() => {
                setLanguage(l.id);
                if (result) generate(l.id);
              }}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm transition ${
                language === l.id
                  ? "bg-brand font-semibold text-navy"
                  : "border border-white/12 bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {!result && (
        <button
          onClick={() => generate()}
          disabled={busy}
          className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 font-semibold text-navy transition hover:bg-brand-light active:scale-95 disabled:opacity-40"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />}
          {busy ? "Reading their history…" : "Write three options"}
        </button>
      )}

      {result && (
        <>
          {/* why this tone */}
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <Guide pose="explain" size={34} />
            <div className="min-w-0">
              <p className="text-[13px] leading-relaxed text-white/70">
                {TONE_EXPLAIN[result.tone] ?? result.toneReason}
              </p>
              <p className="mt-1 text-[11px] text-white/35">
                {result.context.lastPaymentAmount
                  ? `Last paid ${rupee(result.context.lastPaymentAmount)}, ${result.context.daysSincePayment} days ago`
                  : "No payment recorded yet"}
                {result.context.monthsAsCustomer >= 1 && ` · customer for ${result.context.monthsAsCustomer} months`}
                {result.context.previousReminders > 1 && ` · ${result.context.previousReminders} reminders before`}
              </p>
            </div>
          </div>

          {/* variant picker */}
          {result.variants.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {result.variants.map((v, i) => (
                <button
                  key={i}
                  onClick={() => { setChosen(i); setEdited(null); setEditing(false); }}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-[13px] transition ${
                    chosen === i && !edited
                      ? "bg-white/15 font-semibold"
                      : "border border-white/12 bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {VARIANT_LABEL[v.label] ?? v.label}
                </button>
              ))}
            </div>
          )}

          {/* preview / edit */}
          <div className="mt-3">
            {editing ? (
              <textarea
                value={message}
                onChange={(e) => setEdited(e.target.value)}
                rows={5}
                autoFocus
                className="w-full rounded-xl border border-brand/40 bg-white/5 p-3 text-sm leading-relaxed outline-none focus:border-brand/70"
              />
            ) : (
              // Rendered as a WhatsApp bubble so what you see is what they get.
              <div className="rounded-xl rounded-tl-sm bg-[#075E54]/25 p-3.5 text-sm leading-relaxed text-white/90">
                {message}
              </div>
            )}
            {edited !== null && (
              <p className="mt-1.5 text-[11px] text-brand">Edited — your wording will be sent.</p>
            )}
          </div>

          {/* actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            {waLink ? (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-good px-4 py-2.5 text-sm font-semibold text-[#04210F] transition hover:brightness-110"
              >
                <Send size={14} /> Open WhatsApp
              </a>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/40">
                <Info size={14} /> No phone number on file
              </span>
            )}

            <button
              onClick={() => setEditing((v) => !v)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10"
            >
              {editing ? <Check size={14} /> : <Pencil size={14} />} {editing ? "Done" : "Edit"}
            </button>

            <button
              onClick={() => generate()}
              disabled={busy}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-40"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Rewrite
            </button>

            <button
              onClick={() => { navigator.clipboard.writeText(message); toast.success("Copied"); }}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10"
            >
              <Copy size={14} /> Copy
            </button>
          </div>

          <p className="mt-3 text-[11px] text-white/30">
            WhatsApp opens with this text ready. You still press send.
          </p>
        </>
      )}
    </div>
  );
}
