"use client";

import { useState, useEffect, useRef } from "react";
import { Guide } from "@/components/Guide";
import { TrendingUp, TrendingDown, Calendar, Wallet } from "lucide-react";

/**
 * AI Business Advisor showcase — the flagship section.
 *
 * These are the exact SHAPES the real advisor produces (businessAdvisor() in
 * insights.ts). Shown here as a self-playing conversation so a visitor sees
 * the product thinking about a business, not answering a command. The lines
 * are illustrative of a sample shop; the live version computes them from the
 * shop's own ledger.
 */
const MESSAGES = [
  { icon: TrendingUp, tone: "brand", text: "Collect from Ravi this week — ₹8,500 outstanding, and he usually pays on time." },
  { icon: TrendingDown, tone: "amber", text: "Your grocery expenses are up 18% on last month. Worth checking where the extra ₹4,200 went." },
  { icon: Wallet, tone: "brand", text: "You're giving credit faster than collecting it. Consider reminders for the 5 customers still carrying a balance." },
  { icon: Calendar, tone: "good", text: "Diwali is around 12 days away. Collect pending balances before customers ask for festival credit." },
];

export function AdvisorShowcase() {
  const [visible, setVisible] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setVisible(MESSAGES.length); return; }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      MESSAGES.forEach((_, i) => setTimeout(() => setVisible(i + 1), 400 + i * 900));
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* ambient glow to signal "actively analysing" */}
      <div aria-hidden className="pointer-events-none absolute -inset-4 rounded-[2rem] opacity-60"
        style={{ background: "radial-gradient(600px 300px at 20% 0%, rgba(245,158,11,0.12), transparent 70%)" }} />

      <div className="relative liquid rounded-3xl p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="relative">
            <Guide pose="explain" size={64} />
            <span className="absolute -right-1 top-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-good opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-good" />
            </span>
          </div>
          <div>
            <h3 className="font-display text-lg font-bold">Your advisor is watching the numbers</h3>
            <p className="text-sm text-white/50">Proactive advice, not just answers to questions</p>
          </div>
        </div>

        <div className="space-y-3">
          {MESSAGES.map((m, i) => (
            <div key={i}
              className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4"
              style={{
                opacity: visible > i ? 1 : 0,
                transform: visible > i ? "translateY(0)" : "translateY(10px)",
                transition: "opacity 520ms ease, transform 520ms cubic-bezier(0.2,0.8,0.2,1)",
              }}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                m.tone === "brand" ? "bg-brand/15 text-brand" : m.tone === "amber" ? "bg-amber-400/12 text-amber-300" : "bg-good/12 text-good"}`}>
                <m.icon size={17} />
              </span>
              <p className="pt-1 text-sm leading-relaxed text-white/80">{m.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
