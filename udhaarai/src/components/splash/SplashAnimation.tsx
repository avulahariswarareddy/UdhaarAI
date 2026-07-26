"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SceneContext, TimelineContext } from "./engine";
import { SPLASH_SCENES, SPLASH_TOTAL_DURATION } from "./scenes";
import { SW, SH } from "./Frame";

const ACCENT = "#FF8A17";

/**
 * Plays the scene list exactly once, then calls onDone. No playback bar, no
 * seek/scrub, no keyboard shortcuts, no export UI — this is a splash, not a
 * video player. Respects prefers-reduced-motion by skipping straight to
 * onDone instead of playing a long decorative intro.
 */
export default function SplashAnimation({ onDone }: { onDone: () => void }) {
  const [reduceMotion] = useState(() => {
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  });
  const [time, setTime] = useState(0);
  const doneRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduceMotion) {
      doneRef.current = true;
      onDone();
      return;
    }
    let last: number | null = null;
    const tick = (ts: number) => {
      if (last == null) last = ts;
      const dt = (ts - last) / 1000;
      last = ts;
      setTime((t) => {
        const next = t + dt;
        if (next >= SPLASH_TOTAL_DURATION) {
          if (!doneRef.current) {
            doneRef.current = true;
            onDone();
          }
          return SPLASH_TOTAL_DURATION;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const cfg = useMemo(() => ({ accent: ACCENT, glow: 1, particles: 1, reduce: reduceMotion }), [reduceMotion]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setScale(Math.max(0.05, Math.min(el.clientWidth / SW, el.clientHeight / SH)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (reduceMotion) return null;

  let idx = SPLASH_SCENES.length - 1;
  let start = 0;
  for (let i = 0; i < SPLASH_SCENES.length; i++) {
    const end = start + SPLASH_SCENES[i].dur;
    if (time < end) { idx = i; break; }
    start = end;
  }
  const scene = SPLASH_SCENES[idx];
  const localTime = Math.min(Math.max(time - start, 0), scene.dur);
  const sceneCtx = {
    localTime, progress: scene.dur > 0 ? localTime / scene.dur : 0,
    dur: scene.dur, index: idx, count: SPLASH_SCENES.length,
  };
  const Active = scene.Component;

  return (
    <div ref={containerRef} style={{ position: "absolute", inset: 0 }}>
      <div style={{
        position: "absolute", left: "50%", top: "50%", width: SW, height: SH,
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: "center",
      }}>
        <TimelineContext.Provider value={time}>
          <SceneContext.Provider value={sceneCtx}>
            <Active cfg={cfg} />
          </SceneContext.Provider>
        </TimelineContext.Provider>
      </div>
    </div>
  );
}
