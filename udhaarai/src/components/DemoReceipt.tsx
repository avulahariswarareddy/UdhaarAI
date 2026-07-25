"use client";

import { useState } from "react";
import { Receipt, Check, Loader2 } from "lucide-react";
import { Guide } from "@/components/Guide";

/**
 * Receipt preview for the demo. Drawn in HTML rather than generating a real
 * PDF, because the demo has no account, no shop logo and nothing to sign.
 * The layout mirrors the actual PDF so what a judge sees is what a shop gets.
 */
export function DemoReceipt() {
  const [state, setState] = useState<"idle" | "making" | "done">("idle");

  return (
    <div className="liquid rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold">Give the customer a receipt</h2>
          <p className="mt-1 max-w-md text-sm text-white/50">
            Every payment can be turned into a proper PDF — your shop&apos;s logo on it, a
            gapless receipt number, the amount written out in words.
          </p>
        </div>
        <button
          onClick={() => { setState("making"); setTimeout(() => setState("done"), 900); }}
          disabled={state === "making"}
          className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-navy transition hover:bg-brand-light disabled:opacity-50"
        >
          {state === "making" ? <Loader2 size={15} className="animate-spin" /> : <Receipt size={15} />}
          {state === "done" ? "Make another" : "Make a receipt"}
        </button>
      </div>

      {state === "done" && (
        <div className="mt-5" style={{ animation: "none" }}>
          <div className="mx-auto max-w-lg overflow-hidden rounded-xl bg-white text-[#0B1220] shadow-2xl">
            <div className="flex items-start justify-between bg-[#0B1220] px-5 py-4">
              <div>
                <div className="text-[15px] font-bold text-white">Sunrise General Store</div>
                <div className="mt-0.5 text-[9px] text-white/50">Kondapur, Hyderabad · 98765 43210</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] font-bold tracking-wider text-brand">PAYMENT RECEIPT</div>
                <div className="mt-0.5 text-[9px] text-white/50">No. SUN-2026-0184</div>
                <div className="text-[9px] text-white/50">
                  {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </div>
              </div>
            </div>
            <div className="h-[3px] bg-brand" />

            <div className="px-5 py-4">
              <div className="text-[9px] font-bold tracking-wider text-black/45">RECEIVED FROM</div>
              <div className="mt-1 text-[15px] font-bold">Mohammed Irfan</div>
              <div className="text-[10px] text-black/50">96400 12345</div>

              <div className="mt-4 flex items-start justify-between rounded-lg border border-good/50 bg-good/5 p-4">
                <div>
                  <div className="text-[9px] font-bold tracking-wider text-black/45">AMOUNT RECEIVED</div>
                  <div className="mt-1 text-2xl font-bold text-good">Rs 1,400</div>
                  <div className="mt-2 text-[9px] italic text-black/55">
                    One thousand four hundred rupees only
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-bold tracking-wider text-black/45">BALANCE AFTER</div>
                  <div className="mt-1 text-lg font-bold text-good">Rs 0</div>
                  <div className="text-[9px] text-black/45">fully settled</div>
                </div>
              </div>

              <div className="mt-4 flex justify-between border-t border-black/10 pt-3">
                <div className="text-[9px] text-black/40">
                  Computer generated receipt. No signature required.
                </div>
                <div className="text-[10px] font-bold">
                  Udhaar<span className="text-brand">AI</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-3">
            <Guide pose="thumbsup" size={54} />
            <p className="max-w-xs text-sm text-white/55">
              <Check size={13} className="mr-1 inline text-good" />
              In your own shop this downloads as a PDF with your logo on it, ready to send.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
