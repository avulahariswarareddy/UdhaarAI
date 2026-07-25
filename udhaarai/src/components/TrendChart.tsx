"use client";

import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

export function TrendChart({ data }: { data: { day: string; credit: number; payment: number }[] }) {
  const rows = data.map((d) => ({
    day: new Date(d.day).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    credit: Number(d.credit),
    payment: Number(d.payment),
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="gCredit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gPaid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="day" tick={{ fill: "#8A94A6", fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: "#8A94A6", fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              background: "#131C2E",
              border: "1px solid rgba(245,158,11,0.25)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: "#8A94A6" }}
            formatter={(v: number, n: string) => [`\u20B9${v.toLocaleString("en-IN")}`, n === "credit" ? "Credit given" : "Collected"]}
          />
          <Area type="monotone" dataKey="credit" stroke="#F59E0B" strokeWidth={2} fill="url(#gCredit)" />
          <Area type="monotone" dataKey="payment" stroke="#22C55E" strokeWidth={2} fill="url(#gPaid)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
