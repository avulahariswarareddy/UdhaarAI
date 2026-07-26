"use client";

import { createContext, useContext } from "react";

// Ported from animation/animations-v2.jsx (the "omelette" prototyping tool's
// timing engine) — trimmed to just the pure math + context plumbing the
// splash scenes need. The editor/export/video-scrubber machinery in that
// file is deliberately left behind; this splash is not a video.

export const Easing = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => --t * t * t + 1,
  easeInOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  easeInQuart: (t: number) => t * t * t * t,
  easeOutQuart: (t: number) => 1 - --t * t * t * t,
  easeInOutQuart: (t: number) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t),
  easeInSine: (t: number) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine: (t: number) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  easeOutBack: (t: number) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
} as const;

type EaseFn = (t: number) => number;

export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export function interpolate(input: number[], output: number[], ease: EaseFn | EaseFn[] = Easing.linear) {
  return (t: number) => {
    if (t <= input[0]) return output[0];
    if (t >= input[input.length - 1]) return output[output.length - 1];
    for (let i = 0; i < input.length - 1; i++) {
      if (t >= input[i] && t <= input[i + 1]) {
        const span = input[i + 1] - input[i];
        const local = span === 0 ? 0 : (t - input[i]) / span;
        const easeFn = Array.isArray(ease) ? ease[i] || Easing.linear : ease;
        const eased = easeFn(local);
        return output[i] + (output[i + 1] - output[i]) * eased;
      }
    }
    return output[output.length - 1];
  };
}

export function animate({
  from = 0, to = 1, start = 0, end = 1, ease = Easing.easeInOutCubic,
}: { from?: number; to?: number; start?: number; end?: number; ease?: EaseFn }) {
  return (t: number) => {
    if (t <= start) return from;
    if (t >= end) return to;
    const local = (t - start) / (end - start);
    return from + (to - from) * ease(local);
  };
}

/** Seconds elapsed since the splash started (global clock, drives ambient motion). */
export const TimelineContext = createContext(0);
export const useTime = () => useContext(TimelineContext);

export type SceneCtx = { localTime: number; progress: number; dur: number; index: number; count: number };
export const SceneContext = createContext<SceneCtx>({ localTime: 0, progress: 0, dur: 0, index: 0, count: 0 });
export const useScene = () => useContext(SceneContext);
