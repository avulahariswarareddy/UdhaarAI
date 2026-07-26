"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Send, Loader2, Check, Pencil, X, Wand2 } from "lucide-react";
import { Guide } from "@/components/Guide";
import { TranslatableLine } from "@/components/TranslatableLine";
import { PAYMENT_METHODS } from "@/lib/verify/analytics";

/**
 * AI Action Note — the signature feature.
 *
 * The shopkeeper types what they want ("Ramesh paid 500"). The server parses
 * the intent; this component shows what it understood and asks for
 * confirmation before anything that moves money.
 *
 * Nothing here trusts the parse blindly: every money action is confirmed, and
 * the confirmation question itself can be translated to Hindi or Telugu.
 */

type Slots = {
  customerName?: string; amount?: number; method?: string;
  category?: string; query?: string; report?: string;
};
type Proposal = {
  intent: { kind: string; lang: string; confidence: number; slots: Slots; missing: string[] };
  summary: string;
  customerMatches: { id: string; name: string; score: number }[];
  requiresConfirmation: boolean;
  fallbackToAssistant: boolean;
};

export function ActionNote() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [editing, setEditing] = useState(false);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");

  useEffect(() => {
    if (proposal?.intent.slots.amount) setAmount(String(proposal.intent.slots.amount));
    if (proposal?.intent.slots.method) setMethod(proposal.intent.slots.method);
  }, [proposal]);

  /* -------- parse -------- */
  async function interpret() {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    setProposal(null);
    try {
      const res = await fetch("/api/note", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t }),
      });
      const json: Proposal = await res.json();
      if (!res.ok) throw new Error("Could not read that note.");

      // Low confidence → let the ledger assistant handle it as a question.
      if (json.fallbackToAssistant) {
        toast("Sending that to your assistant instead.", { icon: "💬" });
        window.dispatchEvent(new CustomEvent("udhaar:ask", { detail: t }));
        setText("");
        return;
      }
      setProposal(json);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  /* -------- execute after confirmation -------- */
  async function execute() {
    if (!proposal) return;
    const { kind, slots } = proposal.intent;
    setBusy(true);

    try {
      if (kind === "record_payment") {
        // Resolve the customer: an existing strong match, else create.
        let customerId = proposal.customerMatches[0]?.id;
        if (!customerId && slots.customerName) {
          const c = await fetch("/api/customer", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: slots.customerName }),
          }).then((r) => r.json());
          customerId = c.customer?.id;
        }
        if (!customerId) throw new Error("Couldn't identify the customer.");

        const res = await fetch("/api/payment", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerId, amount: Number(amount), method, note: "Added by note" }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Payment failed.");
        toast.success(`Recorded ₹${Number(amount).toLocaleString("en-IN")} from ${slots.customerName}.`);

      } else if (kind === "record_expense") {
        const res = await fetch("/api/expense", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: slots.category ?? "Miscellaneous", amount: Number(amount), method }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Could not save expense.");
        toast.success(`Recorded a ${slots.category} expense of ₹${Number(amount).toLocaleString("en-IN")}.`);

      } else if (kind === "add_customer") {
        const res = await fetch("/api/customer", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: slots.customerName }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Could not add customer.");
        toast.success(`Added ${slots.customerName} to your customers.`);

      } else if (kind === "find_customer") {
        router.push(`/dashboard/customers?q=${encodeURIComponent(slots.customerName ?? slots.query ?? "")}`);
      } else if (kind === "generate_reminder") {
        if (proposal.customerMatches[0]) router.push(`/dashboard/customers/${proposal.customerMatches[0].id}`);
        else router.push("/dashboard/collections");
      } else if (kind === "show_report") {
        window.dispatchEvent(new CustomEvent("udhaar:ask", { detail: slots.query ?? text }));
      }

      setProposal(null);
      setText("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not complete that.");
    } finally {
      setBusy(false);
    }
  }

  const kindLabel: Record<string, string> = {
    record_payment: "Record a payment", record_expense: "Record an expense",
    add_customer: "Add a customer", find_customer: "Find a customer",
    generate_reminder: "Draft a reminder", show_report: "Answer a question",
  };

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
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && interpret()}
          placeholder='e.g. "Ramesh paid 500 via UPI" or "electricity bill 2300"'
          className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-white/30"
        />
        <button onClick={interpret} disabled={busy || !text.trim()} aria-label="Interpret"
          className="shrink-0 cursor-pointer rounded-lg bg-brand p-2 text-navy transition hover:bg-brand-light disabled:opacity-40">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </div>

      {/* the confirmation card */}
      {proposal && proposal.intent.kind !== "unknown" && (
        <div className="mt-4 rounded-2xl border border-brand/25 bg-brand/[0.06] p-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0"><Guide pose={proposal.requiresConfirmation ? "think" : "explain"} size={56} /></div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 font-mono text-[10px] tracking-widest text-brand">
                {kindLabel[proposal.intent.kind] ?? "ACTION"} · {Math.round(proposal.intent.confidence * 100)}% sure
              </div>

              {/* the question, translatable */}
              <TranslatableLine
                text={
                  proposal.requiresConfirmation
                    ? `I understood: ${proposal.summary} Shall I go ahead?`
                    : proposal.summary
                }
                className="text-sm text-white/85"
              />

              {/* duplicate / match hint */}
              {proposal.customerMatches.length > 0 && proposal.intent.kind === "record_payment" && (
                <p className="mt-2 text-[12px] text-white/55">
                  Matching your existing customer <span className="text-white">{proposal.customerMatches[0].name}</span>.
                </p>
              )}

              {/* editable slots for money actions */}
              {editing && proposal.requiresConfirmation && (
                <div className="mt-3 space-y-3 rounded-xl bg-white/5 p-3">
                  <div>
                    <label className="mb-1 block font-mono text-[10px] tracking-widest text-white/45">AMOUNT</label>
                    <input value={amount} inputMode="decimal"
                      onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm outline-none focus:border-brand/60" />
                  </div>
                  <div>
                    <label className="mb-1 block font-mono text-[10px] tracking-widest text-white/45">METHOD</label>
                    <div className="flex flex-wrap gap-1.5">
                      {PAYMENT_METHODS.map((m) => (
                        <button key={m} onClick={() => setMethod(m)}
                          className={`cursor-pointer rounded-lg px-2.5 py-1 text-[12px] transition ${
                            method === m ? "bg-brand font-semibold text-navy" : "border border-white/12 bg-white/5 text-white/70"}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {proposal.intent.missing.includes("amount") && !amount && (
                <p className="mt-2 text-[12px] text-brand">I need an amount — tap Edit to add it.</p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={execute} disabled={busy || (proposal.requiresConfirmation && !Number(amount))}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-good px-3.5 py-2 text-sm font-semibold text-[#04210F] transition hover:brightness-110 disabled:opacity-40">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Yes
                </button>
                {proposal.requiresConfirmation && (
                  <button onClick={() => setEditing((v) => !v)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/12 bg-white/5 px-3.5 py-2 text-sm font-semibold transition hover:bg-white/10">
                    <Pencil size={14} /> Edit
                  </button>
                )}
                <button onClick={() => { setProposal(null); setEditing(false); }}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/12 bg-white/5 px-3.5 py-2 text-sm font-semibold transition hover:bg-white/10">
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
