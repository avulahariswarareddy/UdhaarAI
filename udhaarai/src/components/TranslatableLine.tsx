"use client";

import { useState } from "react";
import { Languages, Loader2 } from "lucide-react";

/**
 * An assistant line the shopkeeper can translate on demand.
 *
 * The prompt requires that when the AI asks the admin a question, the
 * question can be translated. English is the default; a tap swaps it to
 * Hindi or Telugu (and back). The translation is fetched once and cached
 * on the component, so toggling is instant after the first call.
 */
export function TranslatableLine({ text, className = "" }: { text: string; className?: string }) {
  const [shown, setShown] = useState(text);
  const [cache, setCache] = useState<Record<string, string>>({ en: text });
  const [lang, setLang] = useState<"en" | "hi" | "te">("en");
  const [busy, setBusy] = useState(false);

  async function to(target: "en" | "hi" | "te") {
    if (target === lang) return;
    if (cache[target]) { setShown(cache[target]); setLang(target); return; }
    if (target === "en") { setShown(text); setLang("en"); return; }

    setBusy(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, target }),
      });
      const json = await res.json();
      if (res.ok) {
        setCache((c) => ({ ...c, [target]: json.text }));
        setShown(json.text);
        setLang(target);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <p className="leading-relaxed">{shown}</p>
      <div className="mt-2 flex items-center gap-1.5">
        <Languages size={12} className="text-white/30" />
        {(["en", "hi", "te"] as const).map((l) => (
          <button
            key={l}
            onClick={() => to(l)}
            disabled={busy}
            className={`cursor-pointer rounded px-1.5 py-0.5 text-[11px] font-medium transition ${
              lang === l ? "bg-brand/20 text-brand" : "text-white/40 hover:text-white/70"
            }`}
          >
            {l === "en" ? "EN" : l === "hi" ? "हि" : "తె"}
          </button>
        ))}
        {busy && <Loader2 size={11} className="animate-spin text-white/40" />}
      </div>
    </div>
  );
}
