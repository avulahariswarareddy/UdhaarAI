"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

export const SPLASH_SESSION_KEY = "udhaarai-splash-shown";
const FADE_MS = 550;

// The animation needs window/rAF and is meaningless during SSR — load it
// client-only. The overlay div around it (below) is what's actually
// rendered on the server, so there is never a frame of the real homepage
// showing through before this mounts.
const SplashAnimation = dynamic(() => import("./splash/SplashAnimation"), { ssr: false });

/**
 * Plays the splash once per browser tab session, then fades into the real
 * page underneath. The overlay markup is always present in the initial
 * server-rendered HTML (never conditionally mounted) so there is no frame
 * where the homepage is visible before this covers it. On a repeat load
 * within the same session, an inline script in the document <head> (see
 * layout.tsx) hides it via CSS before first paint — see the `splash-skip`
 * rule in globals.css — so this component just no-ops in that case rather
 * than fighting the CSS for control of visibility.
 */
export default function SplashScreen() {
  const [playing, setPlaying] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let alreadyShown = false;
    try {
      alreadyShown = sessionStorage.getItem(SPLASH_SESSION_KEY) === "1";
    } catch {
      // sessionStorage unavailable — fall through and just play the splash.
    }
    if (alreadyShown) {
      setPlaying(false);
      return;
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const handleDone = () => {
    setFading(true);
    setTimeout(() => {
      setPlaying(false);
      document.body.style.overflow = "";
      try {
        sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
      } catch {
        // Ignore — worst case the splash plays again next load.
      }
    }, FADE_MS);
  };

  if (!playing) return null;

  return (
    <div
      id="splash-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#04070d",
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? "none" : "auto",
        transition: `opacity ${FADE_MS}ms ease`,
      }}
    >
      <SplashAnimation onDone={handleDone} />
    </div>
  );
}
