"use client";

import { useEffect, useState } from "react";

const SESSION_KEY = "udhaarai-splash-shown";
// Sum of window.OM_SCENES durations in public/splash/splash.dc.html.
// Keep in sync if the scene timings there change.
const SPLASH_DURATION_MS = 10700;
const FADE_MS = 550;

/**
 * Plays the animated splash once per browser session, then fades into the
 * real page underneath. Rendered above the app in the root layout; renders
 * nothing (and touches nothing) once a session has already seen it.
 */
export default function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let alreadyShown = true;
    try {
      alreadyShown = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      // sessionStorage unavailable (private mode etc.) — just skip the splash.
    }
    if (alreadyShown) return;

    setVisible(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const fadeTimer = setTimeout(() => setFading(true), SPLASH_DURATION_MS);
    const unmountTimer = setTimeout(() => {
      setVisible(false);
      document.body.style.overflow = prevOverflow;
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // Ignore — worst case the splash plays again next load.
      }
    }, SPLASH_DURATION_MS + FADE_MS);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#05080e",
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      <iframe
        src="/splash/splash.dc.html"
        title="UdhaarAI"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </div>
  );
}
