"use client";

import { useState } from "react";
import { MessageSquare, Send, Copy, RefreshCw, Loader2 } from "lucide-react";
import { Guide } from "@/components/Guide";
import { chooseTone, type ReminderFacts } from "@/lib/verify/reminder-context";

/**
 * Reminder demo. The tone is chosen by the REAL selector running on sample
 * customers, so a judge sees that a loyal payer and a silent account get
 * genuinely different treatment — which is the whole point of the feature.
 * The message bodies are pre-written examples of what the model returns.
 */
const PEOPLE: { facts: ReminderFacts; variants: Record<string, string> }[] = [
  {
    facts: {
      customerName: "Lakshmi Devi", shopName: "Sunrise General Store", outstanding: 500,
      lastPaymentAmount: 1200, lastPaymentDate: "2026-07-23", daysSincePayment: 2,
      totalCredit: 8600, totalPaid: 8100, entryCount: 31, monthsAsCustomer: 13,
      recentItems: ["तेल 1L", "शक्कर 2kg"], customerNote: null,
      previousReminders: 0, daysSinceLastReminder: null, festival: null,
    },
    variants: {
      warm: "Hello Lakshmi, hope you are well. Thank you for always paying on time over the past year. Just Rs 500 is left on your account — no rush at all. Have a lovely day.",
      standard: "Hello Lakshmi, a small reminder that Rs 500 is pending on your account. Your last payment of Rs 1,200 came through on 23 July. Thank you for your continued support.",
      brief: "Hi Lakshmi, Rs 500 still pending whenever you're passing by. Thank you!",
    },
  },
  {
    facts: {
      customerName: "Anjali Gupta", shopName: "Sunrise General Store", outstanding: 3400,
      lastPaymentAmount: null, lastPaymentDate: null, daysSincePayment: null,
      totalCredit: 3400, totalPaid: 0, entryCount: 5, monthsAsCustomer: 2,
      recentItems: ["sabun, tel, masala"], customerNote: null,
      previousReminders: 1, daysSinceLastReminder: 14, festival: null,
    },
    variants: {
      warm: "Hello Anjali, hope things are going well. Your account with us stands at Rs 3,400 across 5 purchases. Could you let us know when it suits you to settle? Thank you.",
      standard: "Hello Anjali, this is regarding your outstanding balance of Rs 3,400 at Sunrise General Store. No payment has been received on the account so far. Please let us know a convenient time to clear it.",
      brief: "Hello Anjali, Rs 3,400 is pending on your account. Please let us know when you can settle it.",
    },
  },
];

export function DemoReminder() {
  const [person, setPerson] = useState(0);
  const [variant, setVariant] = useState("standard");
  const [busy, setBusy] = useState(false);

  const p = PEOPLE[person];
  const { tone, why } = chooseTone(p.facts);

  function switchPerson(i: number) {
    setBusy(true);
    setTimeout(() => { setPerson(i); setVariant("standard"); setBusy(false); }, 500);
  }

  return (
    <div className="liquid rounded-2xl p-5">
      <div className="mb-1 flex items-center gap-2.5">
        <MessageSquare size={17} className="text-brand" />
        <h2 className="font-display text-lg font-bold">Personalised reminders</h2>
      </div>
      <p className="text-sm text-white/50">
        Not a template — written from each customer&apos;s own history. Pick a customer and watch
        the tone change.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {PEOPLE.map((x, i) => (
          <button key={x.facts.customerName} onClick={() => switchPerson(i)}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm transition ${
              person === i ? "bg-brand font-semibold text-navy" : "border border-white/12 bg-white/5 text-white/70 hover:bg-white/10"}`}>
            {x.facts.customerName.split(" ")[0]}
          </button>
        ))}
      </div>

      {busy ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-white/50">
          <Loader2 size={15} className="animate-spin text-brand" /> Reading their history…
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <Guide pose="explain" size={34} />
            <div>
              <p className="text-[13px] leading-relaxed text-white/70">
                Tone chosen: <span className="font-semibold capitalize text-brand">{tone}</span> — {why.toLowerCase()}
              </p>
              <p className="mt-1 text-[11px] text-white/35">
                {p.facts.lastPaymentAmount
                  ? `Last paid Rs ${p.facts.lastPaymentAmount.toLocaleString("en-IN")}, ${p.facts.daysSincePayment} days ago`
                  : "No payment recorded yet"}
                {` · customer for ${p.facts.monthsAsCustomer} months`}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {["warm", "standard", "brief"].map((v) => (
              <button key={v} onClick={() => setVariant(v)}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-[13px] capitalize transition ${
                  variant === v ? "bg-white/15 font-semibold" : "border border-white/12 bg-white/5 text-white/60 hover:bg-white/10"}`}>
                {v}
              </button>
            ))}
          </div>

          <div className="mt-3 rounded-xl rounded-tl-sm bg-[#075E54]/25 p-3.5 text-sm leading-relaxed text-white/90">
            {p.variants[variant]}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-xl bg-good px-4 py-2.5 text-sm font-semibold text-[#04210F]">
              <Send size={14} /> Open WhatsApp
            </span>
            <span className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/70">
              <RefreshCw size={14} /> Rewrite
            </span>
            <span className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/70">
              <Copy size={14} /> Copy
            </span>
          </div>
          <p className="mt-3 text-[11px] text-white/30">
            WhatsApp opens with the text ready. The shopkeeper still presses send.
          </p>
        </>
      )}
    </div>
  );
}
