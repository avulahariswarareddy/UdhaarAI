"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Send, MessageSquare } from "lucide-react";

const SUGGESTIONS = [
  "Who owes me the most?",
  "Who hasn't paid in sixty days?",
  "What did I collect this week?",
  "Which customers are new this month?",
  "Summarise how the shop is doing",
];

type Turn = { role: "you" | "app"; text: string };

export default function AssistantPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;

    setTurns((t) => [...t, { role: "you", text: q }]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "The assistant is unavailable.");
      setTurns((t) => [...t, { role: "app", text: json.answer }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The assistant is unavailable.");
      setTurns((t) => t.slice(0, -1));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Ask your ledger</h1>
      <p className="mt-2 text-white/55">
        Answered only from your own entries. If the data doesn&apos;t have it, it will say so
        rather than invent a figure.
      </p>

      <div className="mt-6 flex-1 space-y-4">
        {turns.length === 0 ? (
          <div className="glass rounded-2xl p-6">
            <MessageSquare size={20} className="mb-4 text-brand" />
            <p className="mb-4 text-sm text-white/50">Try one of these:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="rounded-lg border border-white/12 bg-white/5 px-3 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          turns.map((t, i) => (
            <div
              key={i}
              className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                t.role === "you"
                  ? "ml-auto max-w-[85%] bg-brand text-navy font-medium"
                  : "glass max-w-[92%] whitespace-pre-wrap"
              }`}
            >
              {t.text}
            </div>
          ))
        )}

        {busy && (
          <div className="glass flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-white/50">
            <Loader2 size={15} className="animate-spin text-brand" /> Reading your ledger
          </div>
        )}
      </div>

      <div className="sticky bottom-4 mt-6 flex gap-2 rounded-2xl border border-brand/15 bg-navy/95 p-2 backdrop-blur-xl">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask(input)}
          placeholder="Ask about your customers, balances or collections"
          className="w-full bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-white/30"
        />
        <button
          onClick={() => ask(input)}
          disabled={busy || !input.trim()}
          aria-label="Send"
          className="shrink-0 rounded-xl bg-brand p-3 text-navy transition hover:bg-brand-light disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
