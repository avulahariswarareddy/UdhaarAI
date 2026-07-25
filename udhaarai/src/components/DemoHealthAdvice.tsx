"use client";

import { businessHealth, businessAdvisor } from "@/lib/verify/insights";
import { DEMO_CUSTOMERS } from "@/lib/demo-data";
import { Guide } from "@/components/Guide";
import { Heart, TrendingUp, TrendingDown, Wallet, Calendar, Sparkles } from "lucide-react";

const ICON = { collect: TrendingUp, expense: TrendingDown, credit: Wallet, festival: Calendar, praise: Sparkles };

/** Health + advisor for the demo, computed live from the sample customers. */
export function DemoHealthAdvice() {
  const args = { customers: DEMO_CUSTOMERS, monthCollected: 58900, monthCredit: 41200, monthExpenses: 24600, prevMonthExpenses: 20800 };
  const health = businessHealth(args);
  const advice = businessAdvisor(args);
  const color = health.grade === "excellent" ? "#22C55E" : health.grade === "good" ? "#84CC16" : health.grade === "fair" ? "#F59E0B" : "#EF4444";
  const R = 34, C = 2 * Math.PI * R;

  return (
    <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="liquid rounded-2xl p-5">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
          <Heart size={16} className="text-brand" /> Business health
        </h2>
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <svg width="88" height="88" className="-rotate-90">
              <circle cx="44" cy="44" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
              <circle cx="44" cy="44" r={R} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
                strokeDasharray={`${(health.score / 100) * C} ${C}`} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-2xl font-bold" style={{ color }}>{health.score}</span>
            </div>
          </div>
          <div>
            <div className="font-display text-lg font-bold capitalize" style={{ color }}>{health.grade}</div>
            <p className="mt-1 text-xs text-white/45">from this month&apos;s activity</p>
          </div>
        </div>
        <div className="mt-4 space-y-1.5 border-t border-white/8 pt-4">
          {health.factors.slice(0, 4).map((f) => (
            <div key={f.label} className="flex items-center justify-between text-[13px]">
              <span className="text-white/60">{f.detail}</span>
              <span className={`font-mono ${f.delta >= 0 ? "text-good" : "text-brand"}`}>{f.delta >= 0 ? "+" : ""}{f.delta}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="liquid rounded-2xl p-5">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
          <Guide pose="explain" size={26} /> What I&apos;d do next
        </h2>
        <div className="space-y-2.5">
          {advice.map((a, i) => {
            const Icon = ICON[a.kind];
            return (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/12 text-brand"><Icon size={15} /></span>
                <p className="pt-0.5 text-[13px] leading-relaxed text-white/75">{a.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
