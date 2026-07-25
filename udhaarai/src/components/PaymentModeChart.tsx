"use client";

import { rupee } from "@/lib/utils";

const COLORS: Record<string, string> = {
  Cash: "#22C55E", UPI: "#F59E0B", "Credit Card": "#8B5CF6",
  "Debit Card": "#3B82F6", "Bank Transfer": "#06B6D4", Cheque: "#EC4899", Other: "#6B7280",
};

export function PaymentModeChart({ modes }: { modes: { method: string; total: number; count: number }[] }) {
  const total = modes.reduce((s, m) => s + Number(m.total), 0) || 1;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-white/8">
        {modes.map((m) => (
          <div key={m.method}
            className="h-full transition-all duration-700"
            style={{ width: `${(Number(m.total) / total) * 100}%`, background: COLORS[m.method] ?? "#6B7280" }}
            title={`${m.method}: ${rupee(m.total)}`} />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {modes.map((m) => (
          <div key={m.method} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLORS[m.method] ?? "#6B7280" }} />
            <span className="text-white/70">{m.method}</span>
            <span className="ml-auto font-mono text-white/50">{rupee(m.total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
