"use client";

import { useState, useEffect } from "react";
import { quoteOfTheDay, formatToday } from "@/lib/quotes";
import { Sparkles } from "lucide-react";

/**
 * Date and quote render client-side from the browser clock, so "today" is
 * the shopkeeper's today regardless of where the server sits. Hydration-safe:
 * the first paint shows nothing, then the real values fade in, which avoids a
 * server/client mismatch on the date.
 */
export function DashboardHeader() {
  const [today, setToday] = useState("");
  const [quote, setQuote] = useState("");

  useEffect(() => {
    setToday(formatToday());
    setQuote(quoteOfTheDay().text);
  }, []);

  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-stretch lg:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Overview</h1>
        <p className="mt-1 h-5 text-sm text-white/50">{today}</p>
      </div>

      <div className="liquid flex max-w-md items-center gap-3 rounded-2xl px-4 py-3">
        <Sparkles size={16} className="shrink-0 text-brand" />
        <p className="text-sm italic leading-snug text-white/70">
          {quote || "\u00A0"}
        </p>
      </div>
    </div>
  );
}
