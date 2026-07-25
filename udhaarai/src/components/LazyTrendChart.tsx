"use client";

import dynamic from "next/dynamic";

/**
 * Recharts is ~90 kB. Nothing above the fold needs it, and a shopkeeper on a
 * 2G connection shouldn't wait on a charting library to see their balances.
 * Loading it on demand takes it out of the first-load bundle entirely.
 */
export const LazyTrendChart = dynamic(
  () => import("@/components/TrendChart").then((m) => m.TrendChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-56 w-full animate-pulse rounded-xl bg-white/[0.04]" />
    ),
  }
);
