"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Guide, type Pose } from "@/components/Guide";
import { ArrowRight, ArrowLeft, X, Sparkles } from "lucide-react";

/**
 * The guided demo tour.
 *
 * A single fixed overlay dims the whole screen, then punches a lit "hole"
 * over the active element using an SVG mask — so everything except the
 * highlighted feature is darkened and softly blurred, exactly the spotlight
 * effect asked for. The mascot slides to sit beside the spotlight, changes
 * pose per step, and the caption fades between steps. Nothing jumps: the
 * spotlight rectangle and the mascot both animate their position.
 *
 * Steps target elements by a `data-tour` attribute. If a target is missing
 * (a tab not yet opened), the step falls back to a centred card, so the tour
 * never breaks.
 */

export type TourStep = {
  target?: string;         // data-tour value to spotlight
  tab?: string;            // demo tab to switch to first
  pose: Pose;
  title: string;
  body: string;
};

type Rect = { top: number; left: number; width: number; height: number };

export function GuidedTour({
  steps, onExit, onGoToTab,
}: {
  steps: TourStep[];
  onExit: () => void;
  onGoToTab?: (tab: string) => void;
}) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [mounted, setMounted] = useState(false);
  const [captionVisible, setCaptionVisible] = useState(true);
  const step = steps[i];

  useEffect(() => setMounted(true), []);

  const measure = useCallback(() => {
    if (!step?.target) { setRect(null); return; }
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    const pad = 10;
    setRect({
      top: r.top - pad, left: r.left - pad,
      width: r.width + pad * 2, height: r.height + pad * 2,
    });
    // Bring it into view if it's off-screen.
    if (r.top < 80 || r.bottom > window.innerHeight - 80) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [step]);

  // Switch tab first, then measure after the DOM settles.
  useLayoutEffect(() => {
    setCaptionVisible(false);
    if (step?.tab && onGoToTab) onGoToTab(step.tab);
    const t1 = setTimeout(measure, 240);
    const t2 = setTimeout(() => setCaptionVisible(true), 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [i, step, measure, onGoToTab]);

  useEffect(() => {
    const on = () => measure();
    window.addEventListener("resize", on);
    window.addEventListener("scroll", on, true);
    return () => {
      window.removeEventListener("resize", on);
      window.removeEventListener("scroll", on, true);
    };
  }, [measure]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
      if (e.key === "ArrowRight") setI((n) => Math.min(n + 1, steps.length - 1));
      if (e.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit, steps.length]);

  if (!mounted) return null;

  const last = i === steps.length - 1;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  // Where the caption + mascot sit relative to the spotlight.
  const below = rect ? rect.top + rect.height < vh - 260 : true;
  const cardTop = rect ? (below ? rect.top + rect.height + 18 : Math.max(20, rect.top - 250)) : vh / 2 - 120;
  const cardLeft = rect
    ? Math.min(Math.max(16, rect.left), vw - 380)
    : vw / 2 - 190;

  return createPortal(
    <div className="fixed inset-0 z-[100]" style={{ animation: "none" }}>
      {/* dim + spotlight via SVG mask */}
      <svg className="absolute inset-0 h-full w-full" style={{ transition: "opacity 300ms" }}>
        <defs>
          <mask id="spot">
            <rect width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left} y={rect.top} width={rect.width} height={rect.height}
                rx={16} fill="black"
                style={{ transition: "all 420ms cubic-bezier(0.4,0,0.2,1)" }}
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(6,10,18,0.82)" mask="url(#spot)" />
      </svg>

      {/* glowing border around the spotlight */}
      {rect && (
        <div
          className="pointer-events-none absolute rounded-2xl"
          style={{
            top: rect.top, left: rect.left, width: rect.width, height: rect.height,
            boxShadow: "0 0 0 2px rgba(245,158,11,0.9), 0 0 34px rgba(245,158,11,0.4)",
            transition: "all 420ms cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      )}

      {/* exit */}
      <button onClick={onExit}
        className="absolute right-5 top-5 z-10 flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/20">
        <X size={14} /> Skip tour
      </button>

      {/* caption card + mascot */}
      <div
        className="absolute w-[min(360px,calc(100vw-32px))]"
        style={{ top: cardTop, left: cardLeft, transition: "top 460ms cubic-bezier(0.4,0,0.2,1), left 460ms cubic-bezier(0.4,0,0.2,1)" }}
      >
        <div
          className="flex items-end gap-2"
          style={{
            opacity: captionVisible ? 1 : 0,
            transform: captionVisible ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 320ms ease, transform 320ms cubic-bezier(0.2,0.9,0.3,1.1)",
          }}
        >
          <div className="shrink-0 drop-shadow-[0_0_20px_rgba(245,158,11,0.35)]">
            <Guide pose={step.pose} size={82} />
          </div>
          <div className="liquid flex-1 rounded-2xl p-4">
            <div className="mb-1.5 flex items-center gap-2">
              <Sparkles size={13} className="text-brand" />
              <span className="font-mono text-[10px] tracking-widest text-brand">
                {String(i + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
              </span>
            </div>
            <h3 className="font-display text-base font-bold">{step.title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/65">{step.body}</p>

            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => setI((n) => Math.max(n - 1, 0))}
                disabled={i === 0}
                className="inline-flex cursor-pointer items-center gap-1 text-sm text-white/50 transition hover:text-white disabled:opacity-30"
              >
                <ArrowLeft size={14} /> Back
              </button>

              <div className="flex gap-1">
                {steps.map((_, n) => (
                  <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? "w-5 bg-brand" : "w-1.5 bg-white/20"}`} />
                ))}
              </div>

              {last ? (
                <button onClick={onExit}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-navy transition hover:bg-brand-light">
                  Explore <Sparkles size={13} />
                </button>
              ) : (
                <button onClick={() => setI((n) => Math.min(n + 1, steps.length - 1))}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-navy transition hover:bg-brand-light">
                  Next <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
