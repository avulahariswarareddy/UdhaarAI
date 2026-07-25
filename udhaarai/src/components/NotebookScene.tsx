"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The hero object: a notebook rendered with CSS 3D transforms.
 *
 * Deliberately not three.js. A WebGL scene here would add ~600KB, take a
 * second to initialise, and drain battery on the mid-range Android phones
 * this product is actually for. CSS 3D transforms are GPU-composited, cost
 * nothing to load, and degrade gracefully.
 *
 * The page tilts toward the pointer, and the ledger lines fill in on a
 * timer — the notebook writing itself is the product's whole claim.
 */
export function NotebookScene() {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: -14, y: 22 });
  const [written, setWritten] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  /* pointer parallax — skipped entirely when motion is reduced */
  useEffect(() => {
    if (reduced) return;
    function onMove(e: PointerEvent) {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (e.clientX - cx) / r.width;
      const dy = (e.clientY - cy) / r.height;
      setTilt({
        x: -14 - Math.max(-1, Math.min(1, dy)) * 9,
        y: 22 + Math.max(-1, Math.min(1, dx)) * 14,
      });
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduced]);

  /* the page filling itself in */
  useEffect(() => {
    if (reduced) { setWritten(ROWS.length); return; }
    const t = setInterval(
      () => setWritten((n) => (n >= ROWS.length ? 0 : n + 1)),
      900
    );
    return () => clearInterval(t);
  }, [reduced]);

  return (
    <div
      ref={ref}
      className="relative mx-auto flex h-[380px] w-full max-w-md items-center justify-center sm:h-[440px]"
      style={{ perspective: "1400px" }}
      aria-hidden="true"
    >
      {/* glow behind the book */}
      <div
        className="absolute h-64 w-64 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(245,158,11,0.30), transparent 68%)" }}
      />

      <div
        className="relative transition-transform duration-500 ease-out"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        }}
      >
        {/* back cover */}
        <div
          className="absolute inset-0 rounded-r-lg rounded-l-sm"
          style={{
            transform: "translateZ(-26px)",
            background: "linear-gradient(140deg, #7C2D12, #431407)",
            boxShadow: "0 50px 80px -20px rgba(0,0,0,0.8)",
          }}
        />

        {/* page stack, giving the book thickness */}
        {[20, 14, 8].map((z, i) => (
          <div
            key={z}
            className="absolute inset-0 rounded-r-lg rounded-l-sm"
            style={{
              transform: `translateZ(-${z}px) translateX(${i * 1.5}px)`,
              background: "#E7E2D6",
              filter: `brightness(${0.72 + i * 0.07})`,
            }}
          />
        ))}

        {/* the written page */}
        <div
          className="relative h-[300px] w-[228px] overflow-hidden rounded-r-lg rounded-l-sm p-4 sm:h-[340px] sm:w-[260px]"
          style={{
            background: "linear-gradient(165deg, #FAF7EF 0%, #EFE9DA 100%)",
            boxShadow: "inset 14px 0 22px -14px rgba(0,0,0,0.45)",
          }}
        >
          {/* ruled lines */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(180deg, transparent 0 27px, rgba(11,18,32,0.11) 27px 28px)",
            }}
          />
          {/* margin rule */}
          <div className="pointer-events-none absolute inset-y-0 left-8 w-px bg-red-400/35" />

          <div className="relative pl-6 pt-1">
            <div className="mb-3 font-mono text-[9px] tracking-widest text-navy/45">
              \u0909\u0927\u093E\u0930 \u2014 JULY
            </div>

            {ROWS.map((r, i) => (
              <div
                key={r.name}
                className="mb-[11px] flex items-baseline justify-between transition-all duration-700"
                style={{
                  opacity: i < written ? 1 : 0,
                  transform: i < written ? "translateX(0)" : "translateX(-6px)",
                }}
              >
                <span
                  className="text-[11px] text-navy/80"
                  style={{ fontFamily: "'Bricolage Grotesque', cursive" }}
                >
                  {r.name}
                </span>
                <span className="font-mono text-[11px] font-semibold text-navy/70">
                  {r.amt}
                </span>
              </div>
            ))}
          </div>

          {/* the scan sweep */}
          {!reduced && (
            <div
              className="pointer-events-none absolute inset-x-0 h-16"
              style={{
                background:
                  "linear-gradient(180deg, transparent, rgba(245,158,11,0.28), transparent)",
                animation: "scanSweep 3.6s ease-in-out infinite",
              }}
            />
          )}
        </div>

        {/* the verified badge, floating off the page */}
        <div
          className="absolute -bottom-5 -right-5 flex h-14 w-14 items-center justify-center rounded-2xl sm:-bottom-6 sm:-right-7 sm:h-16 sm:w-16"
          style={{
            transform: "translateZ(52px)",
            background: "linear-gradient(145deg, #22C55E, #15803D)",
            boxShadow: "0 18px 36px -8px rgba(34,197,94,0.55)",
            animation: reduced ? undefined : "badgeFloat 5s ease-in-out infinite",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2"
               strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
      </div>

      <style>{`
        @keyframes scanSweep {
          0%   { top: -18%; opacity: 0; }
          18%  { opacity: 1; }
          82%  { opacity: 1; }
          100% { top: 105%; opacity: 0; }
        }
        @keyframes badgeFloat {
          0%, 100% { transform: translateZ(52px) translateY(0); }
          50%      { transform: translateZ(52px) translateY(-11px); }
        }
      `}</style>
    </div>
  );
}

const ROWS = [
  { name: "\u0930\u092E\u0947\u0936", amt: "450" },
  { name: "Lakshmi", amt: "1,200" },
  { name: "\u0C36\u0C4D\u0C30\u0C40\u0C28\u0C41", amt: "780" },
  { name: "Farid", amt: "300" },
  { name: "\u0938\u0941\u0928\u0940\u0924\u093E", amt: "2,150" },
  { name: "Venkat", amt: "95" },
  { name: "Anjali", amt: "640" },
];
