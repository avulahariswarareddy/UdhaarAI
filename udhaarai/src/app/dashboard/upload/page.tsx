"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, Camera, Loader2, AlertTriangle, RotateCw, Wand2, Copy } from "lucide-react";
import { ReviewScreen, type SaveRow } from "@/components/ReviewScreen";
import { preprocessNotebookPage, estimateSharpness, BLUR_THRESHOLD } from "@/lib/image/preprocess";
import { hammingDistance, DUPLICATE_THRESHOLD } from "@/lib/verify/phash";
import type { ExtractionResult } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/client";

const STAGES = [
  "Cleaning up the photo",
  "Checking it isn't a repeat",
  "Reading the handwriting",
  "Verifying the numbers",
];

type Ready = ExtractionResult & { uploadId: string; imageUrl: string | null };

export default function UploadPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [prepNote, setPrepNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const [result, setResult] = useState<Ready | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [history, setHistory] = useState<Record<string, number[]>>({});

  /* Load the existing ledger so the review screen can match names and spot
     outliers without another round trip while the admin is waiting. */
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [{ data: cust }, { data: tx }] = await Promise.all([
        supabase.from("customers").select("id, name"),
        supabase.from("transactions").select("credit, customers(name)").limit(1000),
      ]);
      setCustomers(cust ?? []);
      const map: Record<string, number[]> = {};
      (tx ?? []).forEach((t: Record<string, unknown>) => {
        const n = (t.customers as { name?: string } | null)?.name?.toLowerCase();
        if (!n) return;
        (map[n] ??= []).push(Number(t.credit) || 0);
      });
      setHistory(map);
    })();
  }, []);

  async function handleFile(file?: File | null, force = false) {
    if (!file) return;
    setError(null);
    setDuplicate(null);
    setResult(null);
    setBusy(true);
    setStage(0);
    setPrepNote(null);

    try {
      /* ---- 1. preprocess entirely in the browser ---- */
      const prepped = await preprocessNotebookPage(file);
      setPreview(prepped.dataUrl);

      const saved = Math.round((1 - prepped.processedBytes / prepped.originalBytes) * 100);
      setPrepNote(
        saved > 5
          ? `Cleaned up and shrunk ${saved}% before upload`
          : "Cleaned up before upload"
      );

      /* ---- 2. reject a blurry page before spending an API call ---- */
      const probe = document.createElement("canvas");
      probe.width = prepped.width;
      probe.height = prepped.height;
      const pctx = probe.getContext("2d");
      if (pctx) {
        const img = new Image();
        await new Promise((r) => { img.onload = r; img.src = prepped.dataUrl; });
        pctx.drawImage(img, 0, 0, prepped.width, prepped.height);
        const sharpness = estimateSharpness(probe);
        if (sharpness < BLUR_THRESHOLD && !force) {
          setBusy(false);
          setError(
            `That photo is too blurry to read reliably (sharpness ${Math.round(sharpness)}). Retake it with the notebook flat and steady — you'll get far fewer flagged fields.`
          );
          return;
        }
      }

      /* ---- 3. duplicate page check against what's already uploaded ---- */
      setStage(1);
      if (!force) {
        const supabase = createClient();
        const { data: prior } = await supabase
          .from("uploads")
          .select("id, page_hash, created_at")
          .not("page_hash", "is", null)
          .order("created_at", { ascending: false })
          .limit(200);

        const match = (prior ?? []).find(
          (p: { page_hash: string | null }) =>
            p.page_hash && hammingDistance(p.page_hash, prepped.hash) <= DUPLICATE_THRESHOLD
        );
        if (match) {
          setBusy(false);
          setDuplicate(
            `You uploaded a page that looks identical to this one on ${new Date(
              (match as { created_at: string }).created_at
            ).toLocaleDateString("en-IN")}. Saving it again would double those entries.`
          );
          return;
        }
      }

      /* ---- 4. the one model call ---- */
      setStage(2);
      const body = new FormData();
      body.append("file", new File([prepped.blob], "page.jpg", { type: "image/jpeg" }));
      body.append("hash", prepped.hash);

      const res = await fetch("/api/ocr", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "That page could not be read.");

      setStage(3);
      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong reading that page.");
    } finally {
      setBusy(false);
    }
  }

  async function save(rows: SaveRow[]) {
    const res = await fetch("/api/save-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadId: result?.uploadId ?? null, rows }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Those entries could not be saved.");
      return;
    }

    toast.success(
      `${json.saved} ${json.saved === 1 ? "entry" : "entries"} added${
        json.merged ? ` · ${json.merged} merged into existing customers` : ""
      }`
    );
    router.push("/dashboard/customers");
    router.refresh();
  }

  if (result) {
    return (
      <ReviewScreen
        extraction={result}
        imageUrl={result.imageUrl ?? preview}
        existingCustomers={customers}
        customerHistory={history}
        onSave={save}
        onDiscard={() => { setResult(null); setPreview(null); }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Add a page</h1>
      <p className="mt-2 text-white/55">
        The photo is cleaned up on your phone first, then read, then checked. You confirm before anything saves.
      </p>

      {busy ? (
        <div className="glass mt-8 rounded-3xl p-12 text-center">
          <Loader2 size={30} className="mx-auto mb-5 animate-spin text-brand" />
          <div className="font-display text-xl font-bold">{STAGES[stage]}</div>
          <div className="mt-2 text-sm text-white/45">
            {prepNote ?? "Usually five to fifteen seconds."}
          </div>
          <div className="mx-auto mt-6 flex max-w-xs gap-1.5">
            {STAGES.map((_, i) => (
              <span key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                i <= stage ? "bg-brand" : "bg-white/10"}`} />
            ))}
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
          className="glass mt-8 cursor-pointer rounded-3xl border-dashed p-10 text-center transition hover:brightness-125 sm:p-14"
          style={{ borderColor: "rgba(245,158,11,0.35)" }}
        >
          <Upload size={30} className="mx-auto mb-4 text-brand" />
          <div className="font-display text-xl font-bold">Drop a notebook page here</div>
          <div className="mt-1 text-sm text-white/45">or tap to browse — JPG, PNG, WEBP, HEIC</div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-navy transition hover:bg-brand-light active:scale-95">
              <Upload size={16} /> Choose a photo
            </button>
            <button onClick={(e) => { e.stopPropagation(); camRef.current?.click(); }}
              className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-5 py-3 font-semibold transition hover:bg-white/10 active:scale-95">
              <Camera size={16} /> Use camera
            </button>
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden"
             onChange={(e) => handleFile(e.target.files?.[0])} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden"
             onChange={(e) => handleFile(e.target.files?.[0])} />

      {duplicate && (
        <div className="glass mt-5 rounded-2xl border-brand/50 p-5">
          <div className="flex items-start gap-3">
            <Copy size={18} className="mt-0.5 shrink-0 text-brand" />
            <div>
              <p className="font-semibold">This page looks like one you already added</p>
              <p className="mt-1 text-sm text-white/55">{duplicate}</p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => { setDuplicate(null); fileRef.current?.click(); }}
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-navy">
                  Pick a different page
                </button>
                <button onClick={() => { const f = fileRef.current?.files?.[0]; setDuplicate(null); handleFile(f, true); }}
                  className="rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold transition hover:bg-white/10">
                  It's genuinely new, continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="glass mt-5 rounded-2xl border-brand/50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-brand" />
            <div>
              <p className="font-semibold">{error}</p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => { setError(null); fileRef.current?.click(); }}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold transition hover:bg-white/10">
                  <RotateCw size={14} /> Try another photo
                </button>
                <button onClick={() => { const f = fileRef.current?.files?.[0]; setError(null); handleFile(f, true); }}
                  className="rounded-xl px-4 py-2 text-sm text-white/50 transition hover:text-white">
                  Read it anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="glass mt-6 rounded-2xl p-5">
        <div className="mb-3 flex items-center gap-2">
          <Wand2 size={16} className="text-good" />
          <h2 className="font-display font-bold">What happens on your phone, before upload</h2>
        </div>
        <ul className="space-y-2 text-sm text-white/55">
          <li>Uneven lighting is flattened, so the shadowed half of the page reads as well as the bright half.</li>
          <li>Contrast is stretched using the 2nd–98th percentile, so one glare spot can't wash out the rest.</li>
          <li>Pen strokes are sharpened with an unsharp mask.</li>
          <li>Blurry photos are caught and sent back before an API call is spent.</li>
          <li>A perceptual fingerprint checks you aren't adding the same page twice.</li>
        </ul>
      </div>
    </div>
  );
}
