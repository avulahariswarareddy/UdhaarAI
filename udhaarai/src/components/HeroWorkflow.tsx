"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { BookOpen, Camera, Brain, FileCheck, BarChart3, MessageCircle } from "lucide-react";

/**
 * The hero workflow image, made the anchor of the page.
 *
 * The illustration sits in a glass frame that tilts very slightly toward the
 * cursor (parallax) and drifts on a slow float. When it scrolls into view it
 * fades and scales from 95% to 100% while a blur lifts. The six workflow
 * stages then light up one after another with connector lines drawing between
 * them — so the eye is walked through Notebook → Scan → AI → Verify →
 * Dashboard → Reminders exactly once, then it settles.
 *
 * All transform-only, all reduced-motion aware.
 */
const STAGES = [
  { icon: BookOpen, label: "Notebook" },
  { icon: Camera, label: "Scan" },
  { icon: Brain, label: "AI reads it" },
  { icon: FileCheck, label: "Verify" },
  { icon: BarChart3, label: "Dashboard" },
  { icon: MessageCircle, label: "Reminders" },
];

export function HeroWorkflow() {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [shown, setShown] = useState(false);
  const [lit, setLit] = useState(-1);
  const [still, setStill] = useState(false);

  useEffect(() => {
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (still) { setShown(true); setLit(STAGES.length); return; }

    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      setShown(true);
      // light the stages one by one
      STAGES.forEach((_, i) => setTimeout(() => setLit(i), 500 + i * 320));
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [still]);

  function move(e: React.MouseEvent) {
    if (still || !ref.current || !window.matchMedia("(pointer: fine)").matches) return;
    const r = ref.current.getBoundingClientRect();
    setTilt({ x: ((e.clientX - r.left) / r.width - 0.5) * 6, y: ((e.clientY - r.top) / r.height - 0.5) * -6 });
  }

  return (
    <div
      ref={ref}
      onMouseMove={move}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      className="relative"
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "scale(1)" : "scale(0.95)",
        filter: shown ? "blur(0)" : "blur(8px)",
        transition: "opacity 800ms ease, transform 800ms cubic-bezier(0.2,0.8,0.2,1), filter 800ms ease",
        animation: still ? "none" : "float 7s ease-in-out infinite",
      }}
    >
      <div
        className="liquid overflow-hidden rounded-3xl p-2"
        style={{
          transform: `perspective(1000px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
          transition: "transform 150ms ease-out",
        }}
      >
        <Image
          src="/brand/overview.jpg"
          alt="A shopkeeper writing in his credit notebook while UdhaarAI scans it — the workflow runs notebook, scan, AI extraction, verify, dashboard, WhatsApp reminders"
          width={1400} height={933} priority
          className="w-full rounded-2xl"
        />

        {/* workflow ribbon */}
        <div className="flex flex-wrap items-center justify-center gap-1 px-2 py-3 sm:gap-2">
          {STAGES.map((s, i) => (
            <div key={s.label} className="flex items-center gap-1 sm:gap-2">
              <div
                className="flex flex-col items-center gap-1"
                style={{
                  opacity: lit >= i ? 1 : 0.28,
                  transform: lit >= i ? "translateY(0)" : "translateY(3px)",
                  transition: "opacity 400ms ease, transform 400ms ease",
                }}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors duration-500 ${lit >= i ? "bg-brand text-navy" : "bg-white/8 text-white/40"}`}>
                  <s.icon size={15} />
                </span>
                <span className={`text-[9px] transition-colors duration-500 sm:text-[10px] ${lit >= i ? "text-white/80" : "text-white/35"}`}>
                  {s.label}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <span
                  aria-hidden
                  className="h-[1.5px] w-3 rounded-full sm:w-5"
                  style={{ background: lit > i ? "#F59E0B" : "rgba(255,255,255,0.15)", transition: "background 400ms ease" }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
