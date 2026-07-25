"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const SESSION_KEY = "udhaarai-splash-shown";
// Sum of window.OM_SCENES durations in public/splash/splash.dc.html.
// Keep in sync if the scene timings there change.
const SPLASH_DURATION_MS = 10700;
const FADE_MS = 550;
// The splash's own runtime (public/splash/support.js) posts __dc_booted to
// window.parent once it has actually mounted. If that never arrives — a
// blocked CDN script, a future CSP regression, whatever — bail out fast
// instead of blocking the page behind a dead overlay for the full duration.
const BOOT_TIMEOUT_MS = 4000;

// useLayoutEffect fires before the browser paints, so the overlay is up
// before the real page underneath gets a single frame — plain useEffect
// would let that first frame flash through. Only safe because this
// component is client-only ("use client"); guarded so SSR doesn't warn.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Plays the animated splash once per browser session, then fades into the
 * real page underneath. Rendered above the app in the root layout; renders
 * nothing (and touches nothing) once a session has already seen it.
 */
export default function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useIsomorphicLayoutEffect(() => {
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

    const markShown = () => {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // Ignore — worst case the splash plays again next load.
      }
    };
    const finish = () => {
      setVisible(false);
      document.body.style.overflow = prevOverflow;
      markShown();
    };

    let booted = false;
    const onMessage = (e: MessageEvent) => {
      if (e.source === iframeRef.current?.contentWindow && e.data?.type === "__dc_booted") {
        booted = true;
      }
    };
    window.addEventListener("message", onMessage);

    const bootTimer = setTimeout(() => {
      if (!booted) finish();
    }, BOOT_TIMEOUT_MS);
    const fadeTimer = setTimeout(() => setFading(true), SPLASH_DURATION_MS);
    const unmountTimer = setTimeout(finish, SPLASH_DURATION_MS + FADE_MS);

    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(bootTimer);
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
        ref={iframeRef}
        src="/splash/splash.dc.html"
        title="UdhaarAI"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </div>
  );
}
