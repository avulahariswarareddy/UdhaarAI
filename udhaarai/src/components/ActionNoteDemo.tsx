"use client";

import { useState } from "react";
import { Wand2, Sparkles, Send, Check, Pencil, X } from "lucide-react";
import { Guide } from "@/components/Guide";
import { parseIntent, describeIntent } from "@/lib/verify/intent";

/**
 * Action Note, demo edition. Runs the REAL parser (it's pure and needs no
 * server), so a judge typing "Ramesh paid 500" sees genuine understanding —
 * then a confirmation card, without actually writing to a database.
 */
const EXAMPLES = [
  "Ramesh paid 500 via UPI",
  "electricity bill 2300",
  "add a new customer called Suresh",
  "who owes me the most?",
  "रमेश ने आज ₹500 दिए",
];

export function ActionNoteDemo() {
  const [text, setText] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const parsed = text.trim() ? parseIntent(text) : null;
  const show = parsed && parsed.kind !== "unknown" && parsed.confidence >= 0.55;

  const kindLabel: Record<string, string> = {
    record_payment: "Record a payment", record_expense: "Record an expense",
    add_customer: "Add a customer", find_customer: "Find a customer",
    generate_reminder: "Draft a reminder", show_report: "Answer a question",
  };

  if (done) {
    return (
      <div className="liquid rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <Guide pose="thumbsup" size={54} />
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-good">
              <Check size={15} /> Done
            </div>
            <p className="mt-0.5 text-sm text-white/60">{done}</p>
          </div>
          <button onClick={() => { setDone(null); setText(""); }}
            className="ml-auto cursor-pointer rounded-lg bg-white/8 px-3 py-1.5 text-sm transition hover:bg-white/14">
            Try another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="liquid rounded-2xl p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <Wand2 size={17} className="text-brand" />
        <h2 className="font-display text-lg font-bold">Note</h2>
        <span className="rounded-full bg-brand/12 px-2 py-0.5 text-[10px] font-medium text-brand">
          just say what you want
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 focus-within:border-brand/50">
        <Sparkles size={15} className="shrink-0 text-white/35" />
        <input value={text} onChange={(e) => setText(e.target.value)}
          placeholder='e.g. "Ramesh paid 500 via UPI"'
          className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-white/30" />
        <button aria-label="Interpret" className="shrink-0 cursor-pointer rounded-lg bg-brand p-2 text-navy">
          <Send size={15} />
        </button>
      </div>

      {!text && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {EXAMPLES.map((e) => (
            <button key={e} onClick={() => setText(e)}
              className="cursor-pointer rounded-lg border border-white/12 bg-white/5 px-2.5 py-1.5 text-[12px] text-white/65 transition hover:bg-white/10 hover:text-white">
              {e}
            </button>
          ))}
        </div>
      )}

      {show && parsed && (
        <div className="mt-4 rounded-2xl border border-brand/25 bg-brand/[0.06] p-4">
          <div className="flex items-start gap-3">
            <Guide pose={parsed.kind === "record_payment" || parsed.kind === "record_expense" ? "think" : "explain"} size={52} />
            <div className="min-w-0 flex-1">
              <div className="mb-1 font-mono text-[10px] tracking-widest text-brand">
                {kindLabel[parsed.kind]} · {Math.round(parsed.confidence * 100)}% sure
              </div>
              <p className="text-sm text-white/85">
                {parsed.kind === "record_payment" || parsed.kind === "record_expense"
                  ? `I understood: ${describeIntent(parsed)} Shall I go ahead?`
                  : describeIntent(parsed)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => setDone(describeIntent(parsed))}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-good px-3.5 py-2 text-sm font-semibold text-[#04210F] transition hover:brightness-110">
                  <Check size={14} /> Yes
                </button>
                <button className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/12 bg-white/5 px-3.5 py-2 text-sm font-semibold">
                  <Pencil size={14} /> Edit
                </button>
                <button onClick={() => setText("")}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/12 bg-white/5 px-3.5 py-2 text-sm font-semibold">
                  <X size={14} /> Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
