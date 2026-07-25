"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

/**
 * The old way struck through, the new way revealed.
 *
 * The strike-through draws itself when the row scrolls into view, then the
 * replacement fades in behind it. Sequenced rather than simultaneous, so the
 * eye reads "this is gone" before "this is what replaces it" — which is the
 * whole argument of the product in one gesture.
 */
const ROWS = [
  { old: "Type in every entry by hand", now: "Photograph the page you already wrote" },
  { old: "Flick through the notebook to find a name", now: "Search any customer instantly" },
  { old: "Add it up on a calculator", now: "Balances total themselves" },
  { old: "Work out who to chase from memory", now: "A collection list, ordered, with reasons" },
  { old: "Write each reminder yourself", now: "Reminders drafted in Telugu, Hindi or English" },
  { old: "Hope the notebook survives the monsoon", now: "Backed up the moment you confirm a page" },
  { old: "Hand-write a receipt, or skip it", now: "A proper PDF receipt with your shop's logo" },
];

function Row({ old, now, index }: { old: string; now: string; index: number }) {
  const ref = useRef<HTMLLIElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setSeen(true);
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setTimeout(() => setSeen(true), index * 90);
          io.unobserve(e.target);
        }
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [index]);

  return (
    <li
      ref={ref}
      className="grid items-center gap-3 rounded-2xl border border-white/6 bg-white/[0.02] px-4 py-4 sm:grid-cols-[1fr_auto_1fr] sm:px-5"
    >
      {/* the old way */}
      <div className="relative">
        <span
          className="text-sm transition-colors duration-500 sm:text-[15px]"
          style={{ color: seen ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.72)" }}
        >
          {old}
        </span>
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-[1.5px] bg-white/40"
          style={{
            width: seen ? "100%" : "0%",
            transition: "width 520ms cubic-bezier(0.65,0,0.35,1)",
          }}
        />
      </div>

      {/* the arrow */}
      <div
        className="hidden justify-center sm:flex"
        style={{
          opacity: seen ? 1 : 0,
          transform: seen ? "translateX(0)" : "translateX(-8px)",
          transition: "opacity 420ms ease 420ms, transform 420ms ease 420ms",
        }}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/12 text-brand">
          <ArrowRight size={15} />
        </span>
      </div>

      {/* the new way */}
      <div
        className="font-medium text-white"
        style={{
          opacity: seen ? 1 : 0,
          transform: seen ? "translateY(0)" : "translateY(6px)",
          transition: "opacity 520ms ease 480ms, transform 520ms cubic-bezier(0.2,0.8,0.2,1) 480ms",
        }}
      >
        <span className="text-sm sm:text-[15px]">{now}</span>
      </div>
    </li>
  );
}

export function Transformations() {
  return (
    <ul className="mt-10 space-y-2.5">
      {ROWS.map((r, i) => (
        <Row key={r.old} old={r.old} now={r.now} index={i} />
      ))}
    </ul>
  );
}
