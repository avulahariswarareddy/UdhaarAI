"use client";

import { Fragment } from "react";
import { Easing, clamp, useTime } from "./engine";

// Ported from animation/splash.jsx's Frame + Particles/PaperMotes/Neural.
// HomeScreen (the fake dashboard mockup the original Handoff scene revealed)
// is deliberately not ported — the splash shows only the logo animation and
// then hands off to the real app, never a mocked-up UI of its own.

export const SW = 720, SH = 1280;
const BOOK_W = 382, BOOK_H = (BOOK_W * 480) / 659;
const BOOK_CX = 360, BOOK_CY = 496;
const NAV_CX = 58, NAV_CY = 70, NAV_SCALE = 0.155;
const INK = "#E9EFF7";
const DISPLAY = "'Poppins', 'Trebuchet MS', sans-serif";

export const LANGS = [
  { words: ["Snap.", "Understand.", "Collect."], font: DISPLAY, size: 27 },
  { words: ["स्कैन करें।", "समझें।", "वसूली करें।"], font: "'Noto Sans Devanagari', " + DISPLAY, size: 26 },
  { words: ["స్కాన్ చేయండి.", "అర్థం చేసుకోండి.", "వసూలు చేయండి."], font: "'Noto Sans Telugu', " + DISPLAY, size: 24 },
];

type Cfg = { accent: string; glow: number; particles: number; reduce: boolean };
export type FrameState = Partial<{
  book: number; bookX: number; bookBlur: number; bookRot: number; pulse: number; streaks: number;
  scan: number | null; rupee: number; neural: number;
  shield: number; shieldGlow: number; ripple: number | null;
  udhaar: number; ai: number; aiGlow: number;
  words: [number, number, number];
  flash: number; ring: number; sparkle: number;
  langFade: [number, number, number];
  home: number; glow: number; particles: number; splashFade: number;
}>;

const PARTS = Array.from({ length: 26 }, (_, i) => {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12345.6789;
  return {
    x: (a - Math.floor(a)) * 100,
    y: (b - Math.floor(b)) * 100,
    r: 1 + (i % 3) * 0.9,
    sp: 0.5 + ((i * 7) % 11) / 9,
    o: 0.18 + ((i * 13) % 7) / 18,
    ph: i * 1.7,
  };
});

const PAPERS = Array.from({ length: 5 }, (_, i) => ({
  x: 14 + i * 19, sp: 0.28 + i * 0.05, ph: i * 2.3, r: 5 + (i % 3) * 3,
}));

function Particles({ t, opacity, accent }: { t: number; opacity: number; accent: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, opacity, pointerEvents: "none" }}>
      {PARTS.map((p, i) => {
        const y = (((p.y - t * p.sp * 4.2) % 100) + 100) % 100;
        const x = p.x + Math.sin(t * 0.55 + p.ph) * 1.6;
        const tw = 0.65 + 0.35 * Math.sin(t * 1.9 + p.ph);
        return (
          <div key={i} style={{
            position: "absolute", left: x + "%", top: y + "%",
            width: p.r * 2, height: p.r * 2, borderRadius: "50%",
            background: i % 4 === 0 ? accent : "rgba(210,226,255,0.9)",
            opacity: p.o * tw,
            boxShadow: i % 4 === 0 ? "0 0 8px " + accent : "0 0 6px rgba(180,205,255,0.6)",
          }} />
        );
      })}
    </div>
  );
}

function PaperMotes({ t, opacity }: { t: number; opacity: number }) {
  return (
    <div style={{ position: "absolute", inset: 0, opacity, pointerEvents: "none" }}>
      {PAPERS.map((p, i) => {
        const cyc = (((t * p.sp + p.ph) % 4) + 4) % 4;
        const k = cyc / 4;
        return (
          <div key={i} style={{
            position: "absolute",
            left: p.x + Math.sin(t * 0.8 + p.ph) * 4 + "%",
            top: 72 - k * 46 + "%",
            width: 9, height: 12, borderRadius: 2,
            background: "linear-gradient(140deg, rgba(255,236,208,0.75), rgba(255,170,70,0.15))",
            transform: "rotate(" + (p.r * 6 + Math.sin(t + p.ph) * 14) + "deg)",
            opacity: Math.sin(k * Math.PI) * 0.5,
          }} />
        );
      })}
    </div>
  );
}

function Neural({ v, t, accent }: { v: number; t: number; accent: string }) {
  if (v <= 0.001) return null;
  const cx = BOOK_CX, cy = BOOK_CY;
  const nodes = Array.from({ length: 9 }, (_, i) => {
    const ang = (i / 9) * Math.PI * 2 + 0.4;
    const rad = 190 + (i % 3) * 46;
    return { x: cx + Math.cos(ang) * rad * 1.02, y: cy + Math.sin(ang) * rad * 0.86 };
  });
  const links: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 0], [0, 4], [2, 6], [1, 7], [3, 8]];
  return (
    <svg width={SW} height={SH} style={{ position: "absolute", inset: 0, opacity: v }}>
      {links.map(([a, b], i) => {
        const A = nodes[a], B = nodes[b];
        const len = Math.hypot(B.x - A.x, B.y - A.y);
        const dash = clamp((v - 0.05) * 1.4, 0, 1);
        return (
          <line key={i} x1={A.x} y1={A.y} x2={B.x} y2={B.y}
            stroke="rgba(255,168,64,0.42)" strokeWidth={1}
            strokeDasharray={len} strokeDashoffset={len * (1 - dash)} />
        );
      })}
      {links.map(([a, b], i) => {
        const A = nodes[a], B = nodes[b];
        const k = (((t * 0.55 + i * 0.19) % 1) + 1) % 1;
        return (
          <circle key={"d" + i} cx={A.x + (B.x - A.x) * k} cy={A.y + (B.y - A.y) * k}
            r={2.4} fill={accent} opacity={0.85 * Math.sin(k * Math.PI)} />
        );
      })}
      {nodes.map((n, i) => (
        <circle key={"n" + i} cx={n.x} cy={n.y} r={2.6} fill="rgba(255,214,170,0.85)" opacity={0.7} />
      ))}
    </svg>
  );
}

export function Frame({ s, cfg }: { s: FrameState; cfg: Cfg }) {
  const t = useTime();
  const acc = cfg.accent;
  const reduce = cfg.reduce;
  const rec = s as Record<string, unknown>;
  const g = <T,>(k: string, d: T): T => (rec[k] === undefined ? d : (rec[k] as T));

  let bookIn = g("book", 1), bookX = g("bookX", 0), bookBlur = g("bookBlur", 0);
  let bookRot = g("bookRot", 0), pulse = g("pulse", 0), streaks = g("streaks", 0);
  let scan = g<number | null>("scan", null), rupee = g("rupee", 0.34), neural = g("neural", 0);
  const shieldP = g("shield", 1), shieldGlow = g("shieldGlow", 0.22);
  let ripple = g<number | null>("ripple", null);
  const udhaar = g("udhaar", 1), ai = g("ai", 1), aiGlow = g("aiGlow", 0.55);
  const words = g("words", [1, 1, 1] as [number, number, number]);
  let flash = g("flash", 0), ring = g("ring", 0), sparkle = g("sparkle", 0);
  const langFade = g("langFade", [1, 0, 0] as [number, number, number]);
  const home = g("home", 0), glow = g("glow", 1) * cfg.glow;

  if (reduce) {
    bookX = 0; bookBlur = 0; bookRot = 0; pulse = 0; streaks = 0;
    scan = null; ripple = null; neural = Math.min(neural, 0.22);
    flash = 0; ring = 0; sparkle = 0;
  }

  const breathe = reduce ? 0 : Math.sin(t * 1.25) * 0.006;
  const homeK = Easing.easeInOutCubic(clamp(home, 0, 1));
  const sc = (1 + (NAV_SCALE - 1) * homeK) * (1 + pulse * 0.035 + breathe);
  const tx = bookX + (NAV_CX - BOOK_CX) * homeK;
  const ty = (NAV_CY - BOOK_CY) * homeK;
  const splashFade = g("splashFade", 1);
  const shieldT = Easing.easeOutBack(clamp(shieldP, 0, 1));
  const shieldPulse = reduce ? 0 : (0.5 + 0.5 * Math.sin(t * 2.1)) * 0.35;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#04070d" }}>
      <div style={{
        position: "absolute", inset: 0, opacity: 1 - homeK * 0.85,
        background: "radial-gradient(70% 42% at 50% " + (36 + Math.sin(t * 0.5) * 1.2) + "%, rgba(255,132,20,0.10), transparent 70%)," +
          "radial-gradient(120% 70% at 50% 118%, rgba(20,40,90,0.35), transparent 70%), #04070d",
      }} />
      <div style={{
        position: "absolute", left: "50%", top: BOOK_CY, width: 900, height: 900,
        marginLeft: -450, marginTop: -450, pointerEvents: "none",
        opacity: clamp(glow, 0, 2) * (1 - homeK * 0.9),
        transform: "scale(" + (0.5 + 0.5 * clamp(glow, 0, 1.4) + (reduce ? 0 : Math.sin(t * 0.9) * 0.02)) + ")",
        background: "radial-gradient(circle, rgba(255,146,38,0.30) 0%, rgba(255,120,20,0.12) 32%, rgba(255,110,20,0.03) 55%, transparent 70%)",
      }} />

      <Particles t={t} opacity={g("particles", 1) * cfg.particles * (1 - homeK)} accent={acc} />
      <PaperMotes t={t} opacity={g("particles", 1) * cfg.particles * (1 - homeK) * (reduce ? 0 : 1)} />

      <div style={{ opacity: 1 - homeK }}>
        <Neural v={neural} t={t} accent={acc} />
      </div>

      {/* logo group — travels toward the navbar corner during handoff */}
      <div style={{
        position: "absolute", left: BOOK_CX - BOOK_W / 2, top: BOOK_CY - BOOK_H / 2,
        width: BOOK_W, height: BOOK_H, opacity: bookIn,
        transform: "translate(" + tx + "px," + ty + "px) scale(" + sc + ") rotate(" + bookRot + "deg)",
        transformOrigin: "50% 50%",
        filter: bookBlur > 0.02 ? "blur(" + bookBlur + "px)" : "none",
      }}>
        {streaks > 0.01 && [0, 1, 2, 3].map((i) => (
          <div key={i} style={{
            position: "absolute", right: "82%", top: 22 + i * 17 + "%",
            width: (90 + i * 46) * streaks, height: 3 + (i % 2) * 2, borderRadius: 4,
            background: "linear-gradient(90deg, rgba(255,138,23,0) 0%, " + acc + " 100%)",
            opacity: streaks * 0.75,
          }} />
        ))}

        <img src="/splash/book.png" alt="" style={{ width: "100%", display: "block" }} />

        <div style={{
          position: "absolute", left: "22%", top: "20%", width: "34%", height: "44%",
          borderRadius: "50%", opacity: rupee * 0.9, mixBlendMode: "screen",
          background: "radial-gradient(circle, rgba(255,224,160,0.55), rgba(255,160,50,0.16) 55%, transparent 72%)",
        }} />
        <div style={{
          position: "absolute", inset: 0, overflow: "hidden", mixBlendMode: "screen",
          opacity: reduce ? 0 : 0.5,
        }}>
          <div style={{
            position: "absolute", top: "-20%", bottom: "-20%", width: "26%",
            left: ((t * 16) % 190) - 40 + "%",
            transform: "rotate(14deg)",
            background: "linear-gradient(90deg, transparent, rgba(255,240,210,0.16), transparent)",
          }} />
        </div>
        {scan !== null && (
          <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            <div style={{
              position: "absolute", left: 0, right: 0, top: clamp(scan, 0, 1) * 100 + "%", height: 3,
              background: "linear-gradient(90deg, transparent, rgba(255,232,190,0.95) 25%, rgba(255,255,255,0.98) 50%, rgba(255,232,190,0.95) 75%, transparent)",
              boxShadow: "0 0 26px 8px rgba(255,168,60,0.45)",
              opacity: Math.sin(clamp(scan, 0, 1) * Math.PI) * 1.1,
            }} />
            <div style={{
              position: "absolute", left: 0, right: 0, top: 0, height: clamp(scan, 0, 1) * 100 + "%",
              background: "linear-gradient(180deg, rgba(255,170,60,0.10), rgba(255,190,90,0.02))",
              opacity: Math.sin(clamp(scan, 0, 1) * Math.PI),
            }} />
          </div>
        )}

        <div style={{
          position: "absolute", left: "61.15%", top: "45.83%", width: "31.87%",
          opacity: clamp(shieldP * 2.2, 0, 1),
          transform: "translate(" + (1 - shieldT) * 46 + "px," + (1 - shieldT) * -34 + "px) scale(" + (0.55 + 0.45 * shieldT) + ") rotate(" + (1 - shieldT) * -14 + "deg)",
          transformOrigin: "50% 50%",
          filter: "drop-shadow(0 0 " + (10 + (shieldGlow + shieldPulse * shieldGlow) * 26) + "px rgba(74,222,128," + (0.25 + shieldGlow * 0.5) + "))",
        }}>
          <img src="/splash/shield.png" alt="" style={{ width: "100%", display: "block" }} />
          {ripple !== null && [0, 1].map((i) => {
            const k = clamp(ripple! - i * 0.28, 0, 1);
            if (k <= 0) return null;
            return (
              <div key={i} style={{
                position: "absolute", left: "50%", top: "50%", width: 120, height: 120,
                marginLeft: -60, marginTop: -60, borderRadius: "50%",
                border: "2px solid rgba(94,231,145," + (1 - k) * 0.5 + ")",
                transform: "scale(" + (0.4 + k * 2.1) + ")",
              }} />
            );
          })}
        </div>
      </div>

      {/* wordmark */}
      <div style={{
        position: "absolute", left: 0, right: 0, top: 716, textAlign: "center",
        fontFamily: DISPLAY, fontWeight: 800, fontSize: 78, letterSpacing: "-0.025em",
        opacity: splashFade * clamp(1 - homeK * 2.4, 0, 1),
      }}>
        <span style={{
          display: "inline-block", color: INK,
          opacity: udhaar,
          filter: udhaar < 0.99 && !reduce ? "blur(" + (1 - udhaar) * 12 + "px)" : "none",
          transform: reduce ? "none" : "translateY(" + (1 - udhaar) * 26 + "px) scale(" + (0.94 + 0.06 * udhaar) + ")",
        }}>Udhaar</span>
        <span style={{
          display: "inline-block", color: acc,
          opacity: ai,
          filter: (ai < 0.99 && !reduce ? "blur(" + (1 - ai) * 14 + "px) " : "") +
            "drop-shadow(0 0 " + (14 + aiGlow * 30) + "px rgba(255,140,30," + (0.3 + aiGlow * 0.45) + "))",
          transform: reduce ? "none" : "translateY(" + (1 - ai) * -22 + "px) scale(" + (0.9 + 0.1 * ai) + ")",
        }}>AI</span>
      </div>

      {/* tagline — three languages stacked, cross-faded */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 840, height: 60, opacity: splashFade * (1 - clamp(homeK * 2.4, 0, 1)) }}>
        {LANGS.map((L, li) => {
          const f = clamp(langFade[li] || 0, 0, 1);
          if (f <= 0.001) return null;
          return (
            <div key={li} style={{
              position: "absolute", left: 0, right: 0, top: 0,
              display: "flex", justifyContent: "center", alignItems: "center", gap: 14,
              fontFamily: L.font, fontSize: L.size, fontWeight: 600,
              opacity: f,
              filter: reduce ? "none" : "blur(" + (1 - f) * 6 + "px)",
              transform: reduce ? "none" : "translateY(" + (1 - f) * 10 + "px)",
            }}>
              {L.words.map((w, wi) => {
                const v = clamp(words[wi], 0, 1);
                const col = wi === 1 ? "#FFB325" : "rgba(233,239,247,0.92)";
                return (
                  <Fragment key={wi}>
                    {wi > 0 && (
                      <span style={{ width: 6, height: 6, borderRadius: 3, background: acc, opacity: 0.75 * Math.min(v, clamp(words[wi - 1], 0, 1)) }} />
                    )}
                    <span style={{
                      position: "relative", display: "inline-block", color: col, opacity: v,
                      filter: v < 0.99 && !reduce ? "blur(" + (1 - v) * 7 + "px)" : "none",
                      transform: reduce ? "none" : "translateY(" + (1 - v) * 12 + "px) scale(" + (0.96 + 0.04 * v) + ")",
                    }}>
                      {w}
                      {li === 0 && wi === 0 && flash > 0.01 && (
                        <span style={{
                          position: "absolute", left: "50%", top: "50%", width: 150, height: 90,
                          marginLeft: -75, marginTop: -45, borderRadius: 20, pointerEvents: "none",
                          background: "radial-gradient(circle, rgba(255,255,255," + flash * 0.55 + "), transparent 68%)",
                        }} />
                      )}
                      {li === 0 && wi === 1 && ring > 0.01 && (
                        <span style={{
                          position: "absolute", left: "50%", top: "50%", width: 70, height: 70,
                          marginLeft: -35, marginTop: -35, borderRadius: "50%", pointerEvents: "none",
                          border: "2px solid rgba(255,179,37," + (1 - ring) * 0.65 + ")",
                          transform: "scale(" + (0.5 + ring * 2.4) + ")",
                        }} />
                      )}
                      {li === 0 && wi === 2 && sparkle > 0.01 && [0, 1, 2, 3, 4].map((si) => {
                        const ang = (si / 5) * Math.PI * 2;
                        return (
                          <span key={si} style={{
                            position: "absolute", left: "50%", top: "50%", width: 4, height: 4,
                            borderRadius: 2, background: "#FFE7B0", pointerEvents: "none",
                            opacity: Math.sin(sparkle * Math.PI) * 0.95,
                            transform: "translate(" + Math.cos(ang) * (14 + sparkle * 34) + "px," + Math.sin(ang) * (10 + sparkle * 26) + "px)",
                            boxShadow: "0 0 8px rgba(255,200,110,0.9)",
                          }} />
                        );
                      })}
                    </span>
                  </Fragment>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
