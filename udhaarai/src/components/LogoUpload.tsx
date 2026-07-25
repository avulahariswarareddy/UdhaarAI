"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Loader2, Trash2, ImageIcon } from "lucide-react";

export function LogoUpload({ initialUrl }: { initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file?: File | null) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error("Logo must be under 2 MB.");

    setBusy(true);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/logo", { method: "POST", body });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) return toast.error(json.error ?? "Could not upload that logo.");
    setUrl(URL.createObjectURL(file));
    toast.success("Logo saved. It will appear on your receipts.");
  }

  async function remove() {
    setBusy(true);
    await fetch("/api/logo", { method: "DELETE" });
    setBusy(false);
    setUrl(null);
    toast.success("Logo removed.");
  }

  return (
    <div className="liquid rounded-2xl p-5">
      <h2 className="font-display text-lg font-bold">Your shop logo</h2>
      <p className="mt-1 text-sm text-white/50">
        Printed on every receipt your customers receive, next to the UdhaarAI mark.
        PNG or JPG, under 2 MB.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/12 bg-white/5">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Your shop logo" className="h-full w-full object-contain p-2" />
          ) : (
            <ImageIcon size={26} className="text-white/25" />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-navy transition hover:bg-brand-light disabled:opacity-40"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {url ? "Replace logo" : "Upload logo"}
          </button>
          {url && (
            <button
              onClick={remove}
              disabled={busy}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10"
            >
              <Trash2 size={15} /> Remove
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(e) => upload(e.target.files?.[0])}
      />
    </div>
  );
}
