"use client";

import { Guide } from "@/components/Guide";
import { Sparkles, PlayCircle, ArrowRight } from "lucide-react";

/**
 * Full-screen welcome before the demo dashboard. The mascot waves, floating
 * motifs drift behind, and two clear choices: take the tour, or skip in.
 */
export function DemoWelcome({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden px-5"
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
          <Guide pose="wave" size={140} />
        </div>

        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3 py-1.5 text-xs text-brand">
          <Sparkles size={13} /> Interactive demo · sample shop
        </div>

        <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Welcome to <span className="text-brand">UdhaarAI</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-white/60">
          See how a handwritten notebook becomes a working digital ledger — scanned, checked,
          and ready to collect — in a few clicks.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button onClick={onStart}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand px-7 py-3.5 font-semibold text-navy transition hover:bg-brand-light active:scale-95">
            <PlayCircle size={18} /> Start the tour
          </button>
          <button onClick={onSkip}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-7 py-3.5 font-semibold transition hover:bg-white/10">
            Skip, let me explore <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
