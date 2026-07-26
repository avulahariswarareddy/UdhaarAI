"use client";

import { Frame, type FrameState } from "./Frame";
import { Easing, interpolate, animate, clamp, useScene } from "./engine";

// Ported from animation/splash.jsx's scene components. Audio (Snd/useCue)
// is dropped — a splash that plays automatically on load should never make
// sound without a user gesture. Handoff keeps its shrink-toward-the-navbar
// motion but Frame no longer renders a fake dashboard underneath it.

type Cfg = { accent: string; glow: number; particles: number; reduce: boolean };

export function Ignite({ cfg }: { cfg: Cfg }) {
  const { progress: p } = useScene();
  const s: FrameState = {
    glow: interpolate([0, 0.55, 1], [0.04, 0.8, 1], Easing.easeOutCubic)(p),
    particles: Easing.easeOutQuad(clamp(p * 1.3, 0, 1)),
    book: 0, shield: 0, rupee: 0, udhaar: 0, ai: 0, aiGlow: 0, words: [0, 0, 0],
  };
  return <Frame cfg={cfg} s={s} />;
}

export function Arrive({ cfg }: { cfg: Cfg }) {
  const { progress: p } = useScene();
  const x = interpolate([0, 0.58, 0.8, 1], [-520, 30, -9, 0],
    [Easing.easeOutQuart, Easing.easeOutQuad, Easing.easeInOutQuad])(p);
  const s: FrameState = {
    book: animate({ from: 0, to: 1, start: 0, end: 0.2, ease: Easing.easeOutQuad })(p),
    bookX: x,
    bookBlur: interpolate([0, 0.42, 0.7], [16, 4, 0], Easing.easeOutQuad)(p),
    bookRot: interpolate([0, 0.58, 1], [-7, 2, 0], Easing.easeOutCubic)(p),
    streaks: interpolate([0, 0.3, 0.72], [0, 1, 0], Easing.easeOutQuad)(p),
    shield: 0, rupee: 0, udhaar: 0, ai: 0, aiGlow: 0, words: [0, 0, 0],
  };
  return <Frame cfg={cfg} s={s} />;
}

export function Verify({ cfg }: { cfg: Cfg }) {
  const { progress: p } = useScene();
  const scan = p > 0.04 && p < 0.52 ? (p - 0.04) / 0.48 : null;
  const s: FrameState = {
    scan,
    rupee: interpolate([0, 0.12, 0.34, 0.6], [0, 0.25, 1, 0.34], Easing.easeInOutQuad)(p),
    shield: animate({ from: 0, to: 1, start: 0.46, end: 0.84, ease: Easing.easeOutCubic })(p),
    shieldGlow: interpolate([0.72, 0.86, 1], [0, 1, 0.22], Easing.easeOutQuad)(p),
    ripple: p > 0.8 ? (p - 0.8) / 0.2 : null,
    udhaar: 0, ai: 0, aiGlow: 0, words: [0, 0, 0],
  };
  return <Frame cfg={cfg} s={s} />;
}

export function Comprehend({ cfg }: { cfg: Cfg }) {
  const { progress: p } = useScene();
  const s: FrameState = {
    neural: interpolate([0, 0.2, 0.62, 0.9, 1], [0, 1, 1, 0.18, 0], Easing.easeInOutQuad)(p),
    pulse: interpolate([0.32, 0.48, 0.68], [0, 1, 0], Easing.easeInOutSine)(p),
    udhaar: 0, ai: 0, aiGlow: 0, words: [0, 0, 0],
  };
  return <Frame cfg={cfg} s={s} />;
}

export function Wordmark({ cfg }: { cfg: Cfg }) {
  const { progress: p } = useScene();
  const s: FrameState = {
    udhaar: animate({ start: 0.06, end: 0.52, ease: Easing.easeOutCubic })(p),
    ai: animate({ start: 0.3, end: 0.78, ease: Easing.easeOutCubic })(p),
    aiGlow: interpolate([0.45, 0.72, 1], [0, 1, 0.55], Easing.easeOutQuad)(p),
    words: [0, 0, 0],
  };
  return <Frame cfg={cfg} s={s} />;
}

export function Tagline({ cfg }: { cfg: Cfg }) {
  const { progress: p } = useScene();
  const w = (i: number) => animate({ start: 0.05 + i * 0.21, end: 0.34 + i * 0.21, ease: Easing.easeOutCubic })(p);
  const s: FrameState = {
    words: [w(0), w(1), w(2)],
    flash: interpolate([0.06, 0.13, 0.3], [0, 1, 0], Easing.easeOutQuad)(p),
    ring: interpolate([0.27, 0.45, 0.66], [0, 1, 0], Easing.easeOutQuad)(p),
    sparkle: interpolate([0.48, 0.66, 0.9], [0, 1, 0], Easing.easeOutQuad)(p),
  };
  return <Frame cfg={cfg} s={s} />;
}

export function Languages({ cfg }: { cfg: Cfg }) {
  const { progress: p } = useScene();
  const seg = (a: number, b: number) => Easing.easeInOutCubic(clamp((p - a) / (b - a), 0, 1));
  const en = 1 - seg(0.04, 0.18) + seg(0.74, 0.92);
  const hi = seg(0.1, 0.26) - seg(0.36, 0.5);
  const te = seg(0.42, 0.56) - seg(0.68, 0.84);
  const s: FrameState = { langFade: [clamp(en, 0, 1), clamp(hi, 0, 1), clamp(te, 0, 1)] };
  return <Frame cfg={cfg} s={s} />;
}

export function Handoff({ cfg }: { cfg: Cfg }) {
  const { progress: p } = useScene();
  const home = animate({ start: 0.06, end: 0.82, ease: Easing.easeInOutCubic })(p);
  const s: FrameState = {
    home,
    splashFade: 1 - animate({ start: 0.02, end: 0.28, ease: Easing.easeOutQuad })(p),
    glow: 1 - home * 0.7,
    shieldGlow: 0.22 * (1 - home),
  };
  return <Frame cfg={cfg} s={s} />;
}

export const SPLASH_SCENES: { name: string; dur: number; Component: React.ComponentType<{ cfg: Cfg }> }[] = [
  { name: "Ignite", dur: 0.6, Component: Ignite },
  { name: "Arrive", dur: 0.8, Component: Arrive },
  { name: "Verify", dur: 0.8, Component: Verify },
  { name: "Comprehend", dur: 0.9, Component: Comprehend },
  { name: "Wordmark", dur: 0.7, Component: Wordmark },
  { name: "Tagline", dur: 0.9, Component: Tagline },
  { name: "Languages", dur: 4.4, Component: Languages },
  { name: "Handoff", dur: 1.6, Component: Handoff },
];

export const SPLASH_TOTAL_DURATION = SPLASH_SCENES.reduce((sum, s) => sum + s.dur, 0);
