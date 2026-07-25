"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The wordmark. Colour cycles through the brand ramp on a long, slow loop —
 * slow enough to read as "alive", not as a disco. Respects reduced motion,
 * which the animation below checks before starting.
 */
export function LiveWordmark() {
  const [hue, setHue] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf: number;
    const start = performance.now();
    const tick = (t: number) => {
      setHue(((t - start) / 60) % 360);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <h1
      className="font-display font-extrabold leading-[0.85] tracking-[-0.05em]"
      style={{ fontSize: "clamp(56px, 15vw, 172px)" }}
    >
      <span className="text-white">Udhaar</span>
      <span
        style={{
          backgroundImage: `linear-gradient(${100 + hue * 0.4}deg, #F59E0B, #FBBF24 35%, #22C55E 70%, #F59E0B)`,
          backgroundSize: "300% 100%",
          backgroundPosition: `${hue / 3.6}% 50%`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        AI
      </span>
    </h1>
  );
}

/**
 * Tilts toward the cursor. Pure transform, so it stays on the compositor
 * and never triggers layout. Falls back to a static card on touch devices
 * and under reduced motion.
 */
export function TiltCard({
  children, className = "", intensity = 10,
}: { children: React.ReactNode; className?: string; intensity?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEnabled(fine && !still);
  }, []);

  function move(e: React.MouseEvent) {
    if (!enabled || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setStyle({
      transform: `perspective(900px) rotateX(${-py * intensity}deg) rotateY(${px * intensity}deg) translateZ(6px)`,
      transition: "transform 80ms linear",
    });
  }

  function leave() {
    setStyle({
      transform: "perspective(900px) rotateX(0deg) rotateY(0deg)",
      transition: "transform 500ms cubic-bezier(0.2,0.8,0.2,1)",
    });
  }

  return (
    <div ref={ref} onMouseMove={move} onMouseLeave={leave} style={style} className={className}>
      {children}
    </div>
  );
}

/** A soft glow that follows the cursor across a section. */
export function CursorGlow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (r) setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
      onMouseLeave={() => setPos(null)}
    >
      {pos && (
        <div
          aria-hidden
          className="pointer-events-none absolute -z-0 h-72 w-72 rounded-full opacity-60 blur-3xl transition-opacity"
          style={{
            left: pos.x - 144,
            top: pos.y - 144,
            background: "radial-gradient(circle, rgba(245,158,11,0.22), transparent 70%)",
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/** Reveals on scroll. IntersectionObserver, unobserves after firing. */
export function Reveal({
  children, delay = 0, className = "",
}: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setShown(true);
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.unobserve(e.target);
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(22px)",
        transition: `opacity 620ms ease ${delay}ms, transform 620ms cubic-bezier(0.2,0.8,0.2,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/** Counts up when scrolled into view. */
export function CountUp({ to, prefix = "", suffix = "" }: { to: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setN(to);

    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const dur = 1300;
      const t0 = performance.now();
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / dur);
        setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.5 });

    io.observe(el);
    return () => io.disconnect();
  }, [to]);

  return <span ref={ref}>{prefix}{n.toLocaleString("en-IN")}{suffix}</span>;
}
