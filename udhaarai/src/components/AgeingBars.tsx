"use client";

import { rupee } from "@/lib/utils";

const COLORS = ["#22C55E", "#FBBF24", "#F59E0B", "#EF4444"];

export function AgeingBars({
  buckets,
}: { buckets: { label: string; total: number; count: number }[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.total));
  const grand = buckets.reduce((s, b) => s + b.total, 0);

  if (grand === 0) {
    return <p className="py-8 text-center text-sm text-white/40">Nothing outstanding.</p>;
  }

  return (
    <div className="space-y-3">
      {buckets.map((b, i) => (
        <div key={b.label}>
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="text-white/60">{b.label}</span>
            <span className="font-mono text-white/45">
              {rupee(b.total)}
              <span className="ml-2 text-white/25">
                {b.count} {b.count === 1 ? "person" : "people"}
              </span>
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/6">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(b.total / max) * 100}%`, background: COLORS[i] }}
            />
          </div>
        </div>
      ))}
      <p className="pt-2 text-xs text-white/35">
        Anything past 60 days rarely comes back on its own.
      </p>
    </div>
  );
}
