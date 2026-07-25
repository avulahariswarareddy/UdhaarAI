"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Receipt } from "lucide-react";

/**
 * Downloads the receipt PDF for a payment.
 *
 * The file is streamed from the server rather than built in the browser, so
 * the shop's logo and the receipt number both come from the source of truth
 * and cannot be edited client-side before the customer sees them.
 */
export function ReceiptButton({
  transactionId, compact = false,
}: { transactionId: string; compact?: boolean }) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const res = await fetch("/api/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Could not make that receipt.");
      }

      const blob = await res.blob();
      const name = res.headers.get("Content-Disposition")?.match(/filename="(.+?)"/)?.[1]
        ?? "receipt.pdf";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success("Receipt downloaded. Share it on WhatsApp from your files.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not make that receipt.");
    } finally {
      setBusy(false);
    }
  }

  if (compact) {
    return (
      <button
        onClick={download}
        disabled={busy}
        aria-label="Download receipt"
        title="Download receipt"
        className="shrink-0 cursor-pointer rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-good disabled:opacity-40"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Receipt size={13} />}
      </button>
    );
  }

  return (
    <button
      onClick={download}
      disabled={busy}
      className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-40"
    >
      {busy ? <Loader2 size={15} className="animate-spin" /> : <Receipt size={15} />}
      Download receipt
    </button>
  );
}
