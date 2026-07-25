"use client";

import { useState, useEffect } from "react";

/**
 * The UdhaarAI guide.
 *
 * Drawn as SVG rather than shipped as a bitmap so every pose is one
 * component, scales cleanly on any screen, animates on the compositor,
 * and adds nothing to the image budget. Original artwork — see NOTICE.md
 * for why the reference sheet wasn't used directly.
 */
export type Pose =
  | "wave" | "point-left" | "point-right" | "point-up" | "point-down"
  | "think" | "surprised" | "proud" | "celebrate" | "thumbsup"
  | "explain" | "search" | "scanning" | "done";

const FACE: Record<Pose, { mouth: string; eyes: "open" | "wink" | "closed" | "wide" }> = {
  wave:        { mouth: "big",   eyes: "open" },
  "point-left":{ mouth: "talk",  eyes: "open" },
  "point-right":{ mouth: "talk", eyes: "open" },
  "point-up":  { mouth: "talk",  eyes: "open" },
  "point-down":{ mouth: "talk",  eyes: "open" },
  think:       { mouth: "small", eyes: "closed" },
  surprised:   { mouth: "o",     eyes: "wide" },
  proud:       { mouth: "smile", eyes: "wink" },
  celebrate:   { mouth: "big",   eyes: "open" },
  thumbsup:    { mouth: "smile", eyes: "open" },
  explain:     { mouth: "talk",  eyes: "open" },
  search:      { mouth: "small", eyes: "wide" },
  scanning:    { mouth: "small", eyes: "closed" },
  done:        { mouth: "smile", eyes: "closed" },
};

export function Guide({ pose = "wave", size = 128 }: { pose?: Pose; size?: number }) {
  const f = FACE[pose];
  const S = "#0B1220";

  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 120 138" fill="none" aria-hidden>
      <g stroke={S} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* hair tufts */}
        <path d="M52 18 L56 8 M60 16 L65 7 M68 18 L72 9" />
        {/* head */}
        <ellipse cx="60" cy="42" rx="26" ry="25" fill="#FFF7E8" />
        {/* ear */}
        <path d="M86 42 a5 5 0 0 0 0 9" fill="#FFF7E8" />

        {/* eyes */}
        {f.eyes === "open" && (<>
          <circle cx="52" cy="38" r="2.8" fill={S} stroke="none" />
          <circle cx="69" cy="38" r="2.8" fill={S} stroke="none" />
        </>)}
        {f.eyes === "wide" && (<>
          <circle cx="52" cy="38" r="4.4" fill="#fff" />
          <circle cx="52" cy="38" r="2.4" fill={S} stroke="none" />
          <circle cx="69" cy="38" r="4.4" fill="#fff" />
          <circle cx="69" cy="38" r="2.4" fill={S} stroke="none" />
        </>)}
        {f.eyes === "wink" && (<>
          <path d="M48 38 q4 -4 8 0" />
          <circle cx="69" cy="38" r="2.8" fill={S} stroke="none" />
        </>)}
        {f.eyes === "closed" && (<>
          <path d="M48 39 q4 -4 8 0" />
          <path d="M65 39 q4 -4 8 0" />
        </>)}

        {/* mouth */}
        {f.mouth === "big" && <ellipse cx="62" cy="52" rx="9" ry="6.5" fill={S} stroke="none" />}
        {f.mouth === "talk" && <ellipse cx="62" cy="52" rx="7" ry="5" fill={S} stroke="none" />}
        {f.mouth === "o" && <ellipse cx="62" cy="53" rx="4.5" ry="5.5" fill={S} stroke="none" />}
        {f.mouth === "smile" && <path d="M53 50 q9 8 18 0" />}
        {f.mouth === "small" && <path d="M56 52 q6 4 12 0" />}

        {/* body */}
        <path d="M60 67 L60 96" />
        <path d="M44 78 q16 -9 32 0" fill="#FFF7E8" />
        <path d="M60 96 L50 124 M60 96 L70 124" />

        {/* arms — the pose */}
        {pose === "wave" && (<>
          <path d="M46 80 L28 62" />
          <path d="M24 58 l-4 -5 M28 56 l0 -7 M32 57 l4 -6" />
          <path d="M74 80 L90 92" />
        </>)}
        {pose === "point-right" && (<>
          <path d="M74 80 L102 74" />
          <path d="M102 74 l8 0" />
          <path d="M46 80 L34 94" />
        </>)}
        {pose === "point-left" && (<>
          <path d="M46 80 L18 74" />
          <path d="M18 74 l-8 0" />
          <path d="M74 80 L86 94" />
        </>)}
        {pose === "point-up" && (<>
          <path d="M74 80 L84 52" />
          <path d="M84 52 l0 -9" />
          <path d="M46 80 L34 94" />
        </>)}
        {pose === "point-down" && (<>
          <path d="M74 80 L86 104" />
          <path d="M86 104 l3 8" />
          <path d="M46 80 L34 94" />
        </>)}
        {(pose === "think" || pose === "scanning") && (<>
          <path d="M74 80 L72 60" />
          <path d="M72 60 q2 -6 8 -6" />
          <path d="M46 80 L36 96" />
        </>)}
        {pose === "surprised" && (<>
          <path d="M46 80 L30 68" /><path d="M74 80 L90 68" />
        </>)}
        {(pose === "proud" || pose === "done") && (<>
          <path d="M46 82 q14 8 28 0" />
        </>)}
        {pose === "celebrate" && (<>
          <path d="M46 80 L28 56" /><path d="M74 80 L92 56" />
          <circle cx="26" cy="52" r="4" /><circle cx="94" cy="52" r="4" />
        </>)}
        {pose === "thumbsup" && (<>
          <path d="M74 80 L92 74" />
          <path d="M92 74 q6 -2 5 -8" />
          <path d="M46 80 L34 94" />
        </>)}
        {pose === "explain" && (<>
          <path d="M74 80 q14 4 16 -4" />
          <path d="M46 80 L34 94" />
        </>)}
        {pose === "search" && (<>
          <path d="M46 80 L30 62" />
          <circle cx="26" cy="54" r="9" fill="rgba(245,158,11,0.18)" />
          <path d="M32 61 l6 6" />
          <path d="M74 80 L88 92" />
        </>)}
      </g>

      {/* pose-specific marks */}
      {pose === "surprised" && (
        <text x="92" y="26" fill="#F59E0B" fontSize="20" fontWeight="800">!!</text>
      )}
      {pose === "think" && (
        <text x="90" y="26" fill="#F59E0B" fontSize="22" fontWeight="800">?</text>
      )}
      {pose === "scanning" && (
        <g>
          <circle cx="96" cy="24" r="3" fill="#F59E0B">
            <animate attributeName="opacity" values="1;0.2;1" dur="1s" repeatCount="indefinite" />
          </circle>
          <circle cx="105" cy="24" r="3" fill="#F59E0B">
            <animate attributeName="opacity" values="1;0.2;1" dur="1s" begin="0.2s" repeatCount="indefinite" />
          </circle>
        </g>
      )}
    </svg>
  );
}

/** Guide with a speech bubble, used by the demo tour. */
export function GuideBubble({
  pose, text, side = "right",
}: { pose: Pose; text: string; side?: "left" | "right" }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setShown(true), 40);
    return () => clearTimeout(id);
  }, [text]);

  return (
    <div
      className={`flex items-end gap-3 ${side === "left" ? "flex-row" : "flex-row-reverse"}`}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0) scale(1)" : "translateY(14px) scale(0.96)",
        transition: "opacity 380ms ease, transform 380ms cubic-bezier(0.2,0.9,0.3,1.2)",
      }}
    >
      <div className="shrink-0 drop-shadow-[0_0_18px_rgba(245,158,11,0.25)]">
        <Guide pose={pose} size={92} />
      </div>
      <div className="liquid max-w-xs rounded-2xl px-4 py-3 text-sm leading-relaxed">{text}</div>
    </div>
  );
}
