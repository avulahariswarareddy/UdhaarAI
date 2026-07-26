"use client";

import { Guide } from "@/components/Guide";
import { Sparkles, PlayCircle, ArrowRight } from "lucide-react";

const SUGGESTIONS = [
  "Who owes me the most?",
  "Record ₹500 received from Ramesh via UPI",
  "Show my Business Health Score",
  "Show overdue customers",
];

/**
 * Full-screen welcome before the demo dashboard. The mascot waves, floating
 * motifs drift behind, and two clear choices: take the tour, or skip in.
 * Shown once per browser tab session — see the sessionStorage gate in
 * demo/page.tsx.
 */
export function DemoWelcome({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden overflow-y-auto px-5 py-10"
      style={{ background: "radial-gradient(900px 600px at 50% 0%, rgba(245,158,11,0.12), transparent 60%), #0B1220" }}>
      {/* floating motifs */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {[
          { l: "10%", t: "18%", s: 90, d: "0s", r: -8 },
          { l: "82%", t: "14%", s: 64, d: "1.2s", r: 10 },
          { l: "16%", t: "68%", s: 74, d: "0.6s", r: 6 },
          { l: "86%", t: "64%", s: 96, d: "1.8s", r: -6 },
        ].map((p, k) => (
          <div key={k} className="absolute rounded-2xl border border-brand/12 bg-brand/[0.05]"
            style={{ left: p.l, top: p.t, width: p.s, height: p.s * 1.3,
              transform: `rotate(${p.r}deg)`, animation: `float 8s ease-in-out ${p.d} infinite` }} />
        ))}
      </div>

      <div className="relative w-full max-w-lg text-center">
        <div className="mx-auto mb-6 w-fit drop-shadow-[0_0_30px_rgba(245,158,11,0.4)]">
          <Guide pose="wave" size={130} />
        </div>

        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3 py-1.5 text-xs text-brand">
          <Sparkles size={13} /> TKS Prompt to Product Challenge
        </div>

        <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          Welcome to <span className="text-brand">UdhaarAI</span>!
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/65">
          We&apos;ve already prepared a complete business so you can experience every feature
          immediately — everything here works exactly like the real application, just with
          realistic customers, transactions, expenses, scans and analytics already loaded.
          Explore, experiment, even try to break things. This workspace was made for curious judges. 😄
        </p>

        <div className="mx-auto mt-5 max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left">
          <p className="mb-2 font-mono text-[10px] tracking-widest text-white/40">TRY ASKING THE AI</p>
          <ul className="space-y-1.5 text-sm text-white/70">
            {SUGGESTIONS.map((s) => (
              <li key={s} className="flex items-center gap-2">
                <span className="h-1 w-1 shrink-0 rounded-full bg-brand" /> &ldquo;{s}&rdquo;
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button onClick={onSkip}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand px-7 py-3.5 font-semibold text-navy transition hover:bg-brand-light active:scale-95">
            <ArrowRight size={18} /> Start exploring
          </button>
          <button onClick={onStart}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-7 py-3.5 font-semibold transition hover:bg-white/10">
            <PlayCircle size={16} /> Guided tour
          </button>
        </div>
      </div>
    </div>
  );
}
