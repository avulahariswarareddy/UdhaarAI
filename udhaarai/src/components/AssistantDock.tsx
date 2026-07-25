"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Send, X, Loader2, Sparkles, Minus } from "lucide-react";
import { Guide } from "@/components/Guide";

/**
 * The always-available assistant, pinned bottom-right.
 *
 * Two modes. On the dashboard it queries the real ledger through
 * /api/assistant. In demo mode it answers from the seeded data, so a judge
 * gets the same interaction without an API key or a sign-in.
 */
type Turn = { role: "you" | "app"; text: string };

export function AssistantDock({
  mode = "live", canned = [],
}: {
  mode?: "live" | "demo";
  canned?: { q: string; a: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [nudge, setNudge] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // The /dashboard/assistant page IS this feature in full-page form. Showing
  // the dock on top of it duplicates the UI and, on a phone, the launcher
  // lands squarely on that page's own input bar.
  const redundantHere = pathname === "/dashboard/assistant";

  // One gentle nudge after a while, then never again.
  useEffect(() => {
    const id = setTimeout(() => setNudge(true), 9000);
    return () => clearTimeout(id);
  }, []);

  // The Action Note hands off low-confidence notes and report questions here.
  useEffect(() => {
    const handler = (e: Event) => {
      const q = (e as CustomEvent<string>).detail;
      if (typeof q === "string" && q.trim()) {
        setOpen(true);
        setNudge(false);
        setTimeout(() => ask(q), 120);
      }
    };
    window.addEventListener("udhaar:ask", handler as EventListener);
    return () => window.removeEventListener("udhaar:ask", handler as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  const suggestions = mode === "demo"
    ? canned.map((c) => c.q)
    : ["Who owes me the most?", "Who hasn't paid in sixty days?", "What did I collect this week?"];

  async function ask(q: string) {
    const question = q.trim();
    if (!question || busy) return;

    setTurns((t) => [...t, { role: "you", text: question }]);
    setInput("");
    setBusy(true);

    if (mode === "demo") {
      const hit = canned.find((c) => c.q.toLowerCase() === question.toLowerCase());
      setTimeout(() => {
        setBusy(false);
        setTurns((t) => [...t, {
          role: "app",
          text: hit?.a ?? "In the demo I answer the sample questions below. Sign in with your own shop and I'll answer anything from your real ledger.",
        }]);
      }, 650);
      return;
    }

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const json = await res.json();
      setBusy(false);
      setTurns((t) => [...t, {
        role: "app",
        text: res.ok ? json.answer : (json.error ?? "I couldn't reach the ledger just now."),
      }]);
    } catch {
      setBusy(false);
      setTurns((t) => [...t, { role: "app", text: "I couldn't reach the ledger just now. Try again shortly." }]);
    }
  }

  if (redundantHere) return null;

  return (
    <>
      {/* launcher */}
      {!open && (
        <div className="fixed bottom-5 right-5 z-50 flex items-end gap-3">
          {nudge && !turns.length && (
            <div className="liquid hidden max-w-[210px] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed sm:block"
                 style={{ animation: "none" }}>
              Ask me anything about your ledger.
            </div>
          )}
          <button
            onClick={() => { setOpen(true); setNudge(false); }}
            aria-label="Open the assistant"
            className="liquid liquid-hover group flex h-16 w-16 cursor-pointer items-center justify-center rounded-full"
          >
            <span className="transition-transform duration-300 group-hover:scale-110">
              <Guide pose="wave" size={44} />
            </span>
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-brand" />
            </span>
          </button>
        </div>
      )}

      {/* panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-3xl liquid"
             style={{ height: "min(600px, calc(100vh - 6rem))" }}>
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Guide pose={busy ? "think" : "explain"} size={34} />
              <div>
                <div className="font-display text-sm font-bold">Ask your ledger</div>
                <div className="text-[11px] text-white/40">
                  {mode === "demo" ? "Sample shop" : "Your own entries only"}
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close the assistant"
                    className="cursor-pointer rounded-lg p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white">
              <X size={17} />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {turns.length === 0 && (
              <div className="py-4 text-center">
                <Sparkles size={20} className="mx-auto mb-3 text-brand" />
                <p className="text-sm text-white/50">
                  I only answer from the ledger. If the entries don&apos;t contain it, I&apos;ll say so
                  rather than make a number up.
                </p>
              </div>
            )}

            {turns.map((t, i) => (
              <div key={i} className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                t.role === "you"
                  ? "ml-auto max-w-[85%] bg-brand font-medium text-navy"
                  : "max-w-[92%] border border-white/10 bg-white/[0.06]"}`}>
                {t.text}
              </div>
            ))}

            {busy && (
              <div className="flex max-w-[92%] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white/50">
                <Loader2 size={14} className="animate-spin text-brand" /> Reading the ledger
              </div>
            )}
          </div>

          {turns.length === 0 && (
            <div className="shrink-0 px-4 pb-2">
              <div className="flex flex-wrap gap-1.5">
                {suggestions.slice(0, 4).map((s) => (
                  <button key={s} onClick={() => ask(s)}
                    className="cursor-pointer rounded-lg border border-white/12 bg-white/5 px-2.5 py-1.5 text-[12px] text-white/70 transition hover:bg-white/12 hover:text-white">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex shrink-0 items-center gap-2 border-t border-white/10 p-2.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask(input)}
              placeholder="Ask about balances or customers"
              className="w-full bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-white/30"
            />
            <button onClick={() => ask(input)} disabled={busy || !input.trim()} aria-label="Send"
              className="shrink-0 cursor-pointer rounded-xl bg-brand p-2.5 text-navy transition hover:bg-brand-light disabled:opacity-40">
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
