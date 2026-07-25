"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Check, X, AlertTriangle, RotateCw, ZoomIn, ZoomOut, Trash2, Plus,
  Loader2, ShieldCheck, Wrench, Users, Calculator, Keyboard,
} from "lucide-react";
import type { ExtractionResult } from "@/lib/gemini";
import { adjudicate, isAmountOutlier, type AdjudicatedRow, type Verdict } from "@/lib/verify/adjudicate";
import { findMatches, AUTO_MERGE, ASK_ADMIN, type NameMatch } from "@/lib/verify/names";
import { rupee } from "@/lib/utils";

const T = 0.75;

const FIELDS = [
  { key: "customer_name", label: "Customer", kind: "text", wide: false },
  { key: "phone", label: "Phone", kind: "text", wide: false },
  { key: "date", label: "Date", kind: "text", wide: false },
  { key: "items", label: "Items", kind: "text", wide: true },
  { key: "credit", label: "Credit given", kind: "money", wide: false },
  { key: "payment", label: "Paid", kind: "money", wide: false },
  { key: "notes", label: "Note", kind: "text", wide: true },
] as const;

export type SaveRow = {
  customer_name: string; phone: string; date: string; items: string;
  credit: number; payment: number; notes: string;
  confidence: Record<string, number>;
  mergeIntoCustomerId?: string | null;
};

const blankRow = (): AdjudicatedRow => ({
  _id: crypto.randomUUID(),
  fields: Object.fromEntries(
    FIELDS.map((f) => [
      f.key,
      { value: f.kind === "money" ? 0 : "", verdict: { confidence: 1, reasons: [], corroborations: [] } },
    ])
  ),
  rowFlags: [],
  balanceCheck: null,
});

export function ReviewScreen({
  extraction, imageUrl, existingCustomers, customerHistory, onSave, onDiscard,
}: {
  extraction: ExtractionResult;
  imageUrl: string | null;
  existingCustomers: { id: string; name: string }[];
  customerHistory: Record<string, number[]>;
  onSave: (rows: SaveRow[]) => Promise<void>;
  onDiscard: () => void;
}) {
  const [rows, setRows] = useState<AdjudicatedRow[]>(() => adjudicate(extraction));
  const [merges, setMerges] = useState<Record<string, string | null>>({});
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const firstFlagged = useRef<HTMLInputElement>(null);

  /* ---- name matching against the existing ledger ---- */
  const nameSuggestions = useMemo(() => {
    const out: Record<string, NameMatch[]> = {};
    for (const r of rows) {
      const name = String(r.fields.customer_name.value);
      if (!name) continue;
      const matches = findMatches(name, existingCustomers);
      const top = matches[0];
      // Exact matches need no decision; only surface the ambiguous band.
      if (top && top.score < AUTO_MERGE && top.score >= ASK_ADMIN) out[r._id] = matches;
    }
    return out;
  }, [rows, existingCustomers]);

  /* ---- outlier check against each customer's own history ---- */
  const outliers = useMemo(() => {
    const out: Record<string, string> = {};
    for (const r of rows) {
      const name = String(r.fields.customer_name.value);
      const credit = Number(r.fields.credit.value) || 0;
      const history = customerHistory[name.toLowerCase()] ?? [];
      const check = isAmountOutlier(credit, history);
      if (check.outlier && check.message) out[r._id] = check.message;
    }
    return out;
  }, [rows, customerHistory]);

  const flagged = useMemo(
    () => rows.reduce((n, r) => n + FIELDS.filter((f) => r.fields[f.key].verdict.confidence < T).length, 0),
    [rows]
  );

  const autoFixes = useMemo(
    () => rows.flatMap((r) => FIELDS.map((f) => r.fields[f.key].verdict.autoFixed).filter(Boolean)),
    [rows]
  );

  const totals = useMemo(() => {
    const credit = rows.reduce((s, r) => s + (Number(r.fields.credit.value) || 0), 0);
    const payment = rows.reduce((s, r) => s + (Number(r.fields.payment.value) || 0), 0);
    return { credit, payment, net: credit - payment };
  }, [rows]);

  /* ---- keyboard: Ctrl+Enter saves, Escape discards ---- */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); save(); }
      if (e.key === "Escape") onDiscard();
      if (e.key === "?" && e.shiftKey) setShowHelp((s) => !s);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => { firstFlagged.current?.focus(); }, []);

  function edit(id: string, key: string, value: string) {
    setRows((rs) =>
      rs.map((r) =>
        r._id === id
          ? {
              ...r,
              fields: {
                ...r.fields,
                // Confirming by hand makes it certain, and clears the reasons.
                [key]: { value, verdict: { confidence: 1, reasons: [], corroborations: ["Confirmed by you"] } },
              },
            }
          : r
      )
    );
  }

  async function save() {
    if (saving) return;
    const payload: SaveRow[] = rows
      .filter((r) => String(r.fields.customer_name.value).trim())
      .map((r) => ({
        customer_name: String(r.fields.customer_name.value),
        phone: String(r.fields.phone.value),
        date: String(r.fields.date.value),
        items: String(r.fields.items.value),
        credit: Number(r.fields.credit.value) || 0,
        payment: Number(r.fields.payment.value) || 0,
        notes: String(r.fields.notes.value),
        confidence: Object.fromEntries(FIELDS.map((f) => [f.key, r.fields[f.key].verdict.confidence])),
        mergeIntoCustomerId: merges[r._id] ?? null,
      }));

    if (!payload.length) return toast.error("Every row needs a customer name.");
    setSaving(true);
    await onSave(payload);
    setSaving(false);
  }

  let flaggedSeen = false;

  return (
    <div>
      {/* ---- header ---- */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Confirm before saving</h1>
          <p className="mt-1.5 text-sm text-white/50">
            {rows.length} {rows.length === 1 ? "row" : "rows"}
            {extraction.page_language && ` · ${extraction.page_language}`} ·{" "}
            {flagged > 0
              ? <span className="text-brand">{flagged} field{flagged === 1 ? "" : "s"} need a look</span>
              : <span className="text-good">every field checked out</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowHelp((s) => !s)}
            className="rounded-xl border border-white/12 bg-white/5 px-3 py-2.5 text-sm transition hover:bg-white/10"
            aria-label="Keyboard shortcuts">
            <Keyboard size={15} />
          </button>
          <button onClick={onDiscard}
            className="rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10">
            Discard page
          </button>
        </div>
      </div>

      {showHelp && (
        <div className="glass mb-4 rounded-xl p-4 text-sm text-white/60">
          <span className="font-mono text-brand">Tab</span> next field ·{" "}
          <span className="font-mono text-brand">Ctrl+Enter</span> save ·{" "}
          <span className="font-mono text-brand">Esc</span> discard ·{" "}
          <span className="font-mono text-brand">Shift+?</span> toggle this
        </div>
      )}

      {/* ---- what the checks did ---- */}
      <div className="glass mb-5 rounded-2xl p-4">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck size={16} className="text-good" />
          <span className="font-display text-sm font-bold">Checks run on this page</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Rows read" value={String(rows.length)} />
          <MiniStat label="Fields flagged" value={String(flagged)} tone={flagged ? "brand" : "good"} />
          <MiniStat label="Auto-corrected" value={String(autoFixes.length)} tone="good" />
          <MiniStat label="Page total" value={rupee(totals.net)} />
        </div>
        {autoFixes.length > 0 && (
          <p className="mt-3 flex items-start gap-2 text-xs text-good">
            <Wrench size={12} className="mt-0.5 shrink-0" />
            {[...new Set(autoFixes)].join(" · ")}
          </p>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {/* ---- page ---- */}
        <div className="glass rounded-2xl p-3 lg:sticky lg:top-32 lg:self-start">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="font-mono text-[11px] tracking-widest text-white/40">THE PAGE</span>
            <div className="flex gap-1">
              <IconBtn onClick={() => setZoom((z) => Math.max(1, z - 0.25))} label="Zoom out"><ZoomOut size={14} /></IconBtn>
              <IconBtn onClick={() => setZoom((z) => Math.min(4, z + 0.25))} label="Zoom in"><ZoomIn size={14} /></IconBtn>
              <IconBtn onClick={() => setRotation((r) => (r + 90) % 360)} label="Rotate"><RotateCw size={14} /></IconBtn>
            </div>
          </div>
          <div className="overflow-auto rounded-xl bg-black" style={{ maxHeight: 560 }}>
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="The notebook page you uploaded"
                className="w-full object-contain transition-transform duration-200"
                style={{ transform: `rotate(${rotation}deg) scale(${zoom})` }} />
            ) : (
              <div className="p-12 text-center text-sm text-white/40">
                The preview expired. The readings below are still valid.
              </div>
            )}
          </div>
        </div>

        {/* ---- rows ---- */}
        <div className="space-y-4">
          {rows.map((row, i) => {
            const suggestions = nameSuggestions[row._id];
            const outlier = outliers[row._id];
            return (
              <div key={row._id} className="glass rounded-2xl p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-[11px] tracking-widest text-white/40">
                    ROW {String(i + 1).padStart(2, "0")}
                  </span>
                  <IconBtn onClick={() => setRows((rs) => rs.filter((r) => r._id !== row._id))} label="Remove row">
                    <Trash2 size={14} />
                  </IconBtn>
                </div>

                {/* possible duplicate customer */}
                {suggestions && (
                  <div className="mb-3 rounded-xl border border-brand/40 bg-brand/8 p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-brand">
                      <Users size={13} /> Is this someone already in your ledger?
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((m) => (
                        <button key={m.id}
                          onClick={() => {
                            setMerges((x) => ({ ...x, [row._id]: m.id }));
                            edit(row._id, "customer_name", m.name);
                            toast.success(`Merged into ${m.name}`);
                          }}
                          className="rounded-lg bg-white/8 px-3 py-1.5 text-xs transition hover:bg-white/15">
                          {m.name}{" "}
                          <span className="font-mono text-white/40">{Math.round(m.score * 100)}%</span>
                        </button>
                      ))}
                      <button onClick={() => setMerges((x) => ({ ...x, [row._id]: null }))}
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/8">
                        No, new customer
                      </button>
                    </div>
                  </div>
                )}

                {outlier && (
                  <div className="mb-3 flex items-start gap-2 rounded-xl border border-brand/30 bg-brand/6 p-3 text-xs text-brand">
                    <Calculator size={13} className="mt-0.5 shrink-0" /> {outlier}
                  </div>
                )}

                {row.rowFlags.map((f) => (
                  <div key={f} className="mb-3 flex items-start gap-2 rounded-xl border border-brand/30 bg-brand/6 p-3 text-xs text-brand">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {f}
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-3">
                  {FIELDS.map((f) => {
                    const cell = row.fields[f.key];
                    const low = cell.verdict.confidence < T;
                    const isFirst = low && !flaggedSeen;
                    if (isFirst) flaggedSeen = true;
                    return (
                      <FieldInput
                        key={f.key}
                        id={`${row._id}-${f.key}`}
                        inputRef={isFirst ? firstFlagged : undefined}
                        label={f.label}
                        kind={f.kind}
                        wide={f.wide}
                        value={cell.value}
                        verdict={cell.verdict}
                        onChange={(v) => edit(row._id, f.key, v)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}

          <button onClick={() => setRows((rs) => [...rs, blankRow()])}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 py-3 text-sm text-white/50 transition hover:bg-white/5 hover:text-white">
            <Plus size={15} /> Add a row it missed
          </button>

          {/* pr-20 on mobile keeps these controls clear of the assistant dock,
              which is fixed to the bottom-right corner */}
          <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-2xl border border-brand/15 bg-navy/95 p-3 pr-20 backdrop-blur-xl sm:pr-3">
            <button onClick={save} disabled={saving || !rows.length}
              className="inline-flex items-center gap-2 rounded-xl bg-good px-5 py-3 font-semibold text-[#04210F] transition hover:brightness-110 active:scale-95 disabled:opacity-40">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Save to ledger
            </button>
            <button onClick={onDiscard}
              className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm font-semibold transition hover:bg-white/10">
              <X size={15} /> Discard
            </button>
            <span className="font-mono text-xs text-white/45">
              {rupee(totals.credit)} credit · {rupee(totals.payment)} paid
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function FieldInput({
  id, label, kind, wide, value, verdict, onChange, inputRef,
}: {
  id: string; label: string; kind: string; wide: boolean;
  value: string | number; verdict: Verdict;
  onChange: (v: string) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}) {
  const low = verdict.confidence < T;
  return (
    <div className={wide ? "col-span-2" : ""}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={id} className={`font-mono text-[10px] tracking-widest ${low ? "text-brand" : "text-white/40"}`}>
          {label.toUpperCase()}
        </label>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] ${
          low ? "bg-brand/15 text-brand" : "bg-good/12 text-good"}`}>
          {low && <AlertTriangle size={9} />}
          {Math.round(verdict.confidence * 100)}%
        </span>
      </div>
      <input
        id={id}
        ref={inputRef}
        value={String(value ?? "")}
        inputMode={kind === "money" ? "decimal" : "text"}
        onChange={(e) => onChange(kind === "money" ? e.target.value.replace(/[^\d.]/g, "") : e.target.value)}
        className={`w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:border-brand/70 ${
          low ? "field-flag border" : "border border-white/10 bg-white/5"} ${kind === "money" ? "font-mono" : ""}`}
      />
      {verdict.reasons.map((r) => (
        <p key={r} className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-brand">
          <AlertTriangle size={10} className="mt-0.5 shrink-0" />{r}
        </p>
      ))}
      {!low && verdict.corroborations.length > 0 && (
        <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-good/70">
          <ShieldCheck size={10} className="mt-0.5 shrink-0" />{verdict.corroborations[0]}
        </p>
      )}
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "brand" | "good" }) {
  const color = tone === "brand" ? "text-brand" : tone === "good" ? "text-good" : "text-white";
  return (
    <div>
      <div className="font-mono text-[9px] tracking-widest text-white/35">{label.toUpperCase()}</div>
      <div className={`mt-0.5 font-mono text-base font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function IconBtn({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} aria-label={label} title={label}
      className="rounded-lg bg-white/6 p-1.5 text-white/70 transition hover:bg-white/12 hover:text-white">
      {children}
    </button>
  );
}
