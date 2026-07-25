import { parseAmount, hasIndicDigits, normaliseDigits } from "./numerals";
import { checkPhone } from "./phone";
import { checkDate } from "./dates";
import type { ExtractedRow, ExtractionResult } from "@/lib/gemini";

/**
 * The adjudicator.
 *
 * Gemini reports how confident it feels. Feelings are not evidence. This
 * module takes the model's raw output and independently checks whatever can
 * be checked with arithmetic and structure, then rewrites the confidence.
 *
 * Rules of the system:
 *   - A check that FAILS can push confidence down to a hard ceiling.
 *   - A check that PASSES can raise it, but never above 0.99 — no
 *     handwriting read is ever certain.
 *   - Every adjustment carries a human-readable reason shown in the UI.
 *     The admin should always be able to see WHY something is flagged.
 *
 * This is the difference between "the AI said so" and "the numbers agree".
 */

export type Verdict = {
  confidence: number;
  reasons: string[];       // why it was lowered — shown in amber
  corroborations: string[]; // why it was raised — shown in green
  autoFixed?: string;      // what this module silently corrected
};

export type AdjudicatedRow = {
  _id: string;
  fields: Record<string, { value: string | number; verdict: Verdict }>;
  rowFlags: string[];
  balanceCheck: { ok: boolean | null; expected: number | null; message: string } | null;
};

const FIELD_KEYS = ["customer_name", "phone", "date", "items", "credit", "payment", "notes"] as const;
type FieldKey = (typeof FIELD_KEYS)[number];

function clamp(n: number) {
  return Math.min(0.99, Math.max(0.05, n));
}

/* ------------------------------------------------------------------ */
/*  Per-field adjudication                                             */
/* ------------------------------------------------------------------ */

function adjudicateName(raw: unknown, modelConf: number): { value: string; verdict: Verdict } {
  const value = String(raw ?? "").trim();
  const reasons: string[] = [];
  const corroborations: string[] = [];
  let conf = modelConf;

  if (!value) {
    return {
      value,
      verdict: { confidence: 0.1, reasons: ["No name read for this row"], corroborations: [] },
    };
  }
  if (value.length < 2) {
    conf = Math.min(conf, 0.35);
    reasons.push("Suspiciously short for a name");
  }
  if (/\d/.test(value)) {
    conf = Math.min(conf, 0.45);
    reasons.push("Contains digits — may be an amount misread as a name");
  }
  if (value.length > 60) {
    conf = Math.min(conf, 0.4);
    reasons.push("Too long — probably two rows merged");
  }
  // A name made only of consonants is almost certainly a misread
  if (/^[bcdfghjklmnpqrstvwxyz\s]+$/i.test(value) && value.length > 3) {
    conf = Math.min(conf, 0.4);
    reasons.push("No vowels — likely misread");
  }
  if (!reasons.length && /^[\p{L}][\p{L}\s.'-]{1,}$/u.test(value)) {
    conf = Math.max(conf, Math.min(0.9, modelConf + 0.05));
    corroborations.push("Well-formed name");
  }

  return { value, verdict: { confidence: clamp(conf), reasons, corroborations } };
}

function adjudicatePhone(raw: unknown, modelConf: number): { value: string; verdict: Verdict } {
  const check = checkPhone(raw);
  const original = String(raw ?? "").trim();

  if (!original) {
    return { value: "", verdict: { confidence: 1, reasons: [], corroborations: [] } };
  }
  if (!check.valid) {
    return {
      value: check.normalised || original,
      verdict: {
        confidence: clamp(Math.min(modelConf, 0.3)),
        reasons: [`Not a valid Indian mobile — ${check.reason}`],
        corroborations: [],
      },
    };
  }
  return {
    value: check.normalised,
    verdict: {
      confidence: clamp(Math.max(modelConf, 0.95)),
      reasons: [],
      corroborations: ["Valid 10-digit Indian mobile"],
      autoFixed: check.normalised !== original.replace(/\D/g, "") ? "Normalised format" : undefined,
    },
  };
}

function adjudicateDate(raw: unknown, modelConf: number): { value: string; verdict: Verdict } {
  const original = String(raw ?? "").trim();
  if (!original) return { value: "", verdict: { confidence: 1, reasons: [], corroborations: [] } };

  const check = checkDate(original);
  if (!check.valid) {
    return {
      value: original,
      verdict: {
        confidence: clamp(Math.min(modelConf, 0.35)),
        reasons: [`Date does not parse — ${check.reason}`],
        corroborations: [],
      },
    };
  }

  const reasons: string[] = [];
  const corroborations: string[] = ["Parses to a real calendar date"];
  let conf = Math.max(modelConf, 0.9);

  if (check.iso && new Date(check.iso).getTime() > Date.now() + 86400000) {
    conf = Math.min(conf, 0.4);
    reasons.push("Date is in the future");
    corroborations.length = 0;
  }

  return { value: original, verdict: { confidence: clamp(conf), reasons, corroborations } };
}

function adjudicateAmount(
  raw: unknown,
  modelConf: number,
  label: string
): { value: number; verdict: Verdict } {
  const original = String(raw ?? "");
  const parsed = parseAmount(raw);
  const reasons: string[] = [];
  const corroborations: string[] = [];
  let conf = modelConf;
  let autoFixed: string | undefined;

  if (hasIndicDigits(original)) {
    autoFixed = "Converted Indic numerals to digits";
    corroborations.push(autoFixed);
  }

  if (parsed === null) {
    if (original.trim() === "" || original.trim() === "0") {
      return { value: 0, verdict: { confidence: 1, reasons: [], corroborations: [] } };
    }
    return {
      value: 0,
      verdict: {
        confidence: 0.2,
        reasons: [`${label} could not be read as a number`],
        corroborations: [],
      },
    };
  }

  if (parsed > 500000) {
    conf = Math.min(conf, 0.3);
    reasons.push("Unusually large for a kirana entry — check the digit count");
  }
  if (parsed > 0 && parsed < 1) {
    conf = Math.min(conf, 0.4);
    reasons.push("Less than one rupee — likely a decimal misread");
  }
  // Amounts ending in a lone digit after many zeros, e.g. 10001, are usually
  // a stray pen mark read as a digit.
  if (/^\d0{3,}[1-9]$/.test(String(parsed))) {
    conf = Math.min(conf, 0.55);
    reasons.push("Odd trailing digit — check for a stray mark");
  }
  if (!reasons.length && parsed > 0) {
    corroborations.push("Parses cleanly");
  }

  return { value: parsed, verdict: { confidence: clamp(conf), reasons, corroborations, autoFixed } };
}

function adjudicateText(raw: unknown, modelConf: number): { value: string; verdict: Verdict } {
  const value = normaliseDigits(String(raw ?? "").trim());
  return { value, verdict: { confidence: clamp(value ? modelConf : 1), reasons: [], corroborations: [] } };
}

/* ------------------------------------------------------------------ */
/*  Row and page level checks                                          */
/* ------------------------------------------------------------------ */

/**
 * Cross-field arithmetic. If the page carries a running balance, we can
 * verify it: previous balance + credit - payment should equal this balance.
 *
 * This is the single most valuable check in the file. It catches confident
 * digit misreads that no amount of model self-reporting would ever surface,
 * because the model has no way to know it dropped a zero.
 */
export function reconcileRunningBalance(
  rows: { credit: number; payment: number; balance: number | null }[]
): { index: number; expected: number; actual: number; drift: number }[] {
  const problems: { index: number; expected: number; actual: number; drift: number }[] = [];
  let running: number | null = null;

  rows.forEach((r, i) => {
    if (r.balance === null) return;
    if (running === null) {
      running = r.balance;
      return;
    }
    const expected = running + r.credit - r.payment;
    const drift = Math.abs(expected - r.balance);
    // One rupee of tolerance for rounding in the shopkeeper's own arithmetic
    if (drift > 1) problems.push({ index: i, expected, actual: r.balance, drift });
    running = r.balance;
  });

  return problems;
}

/**
 * Statistical outlier check against a customer's own history.
 * Modified z-score using the median absolute deviation, which is robust to
 * the small samples and heavy skew a kirana ledger actually has. A plain
 * standard deviation would flag almost nothing on ten entries.
 */
export function isAmountOutlier(
  amount: number,
  history: number[]
): { outlier: boolean; message?: string } {
  const values = history.filter((v) => v > 0);
  if (values.length < 5 || amount <= 0) return { outlier: false };

  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const deviations = sorted.map((v) => Math.abs(v - median)).sort((a, b) => a - b);
  const mad = deviations[Math.floor(deviations.length / 2)];

  if (mad === 0) {
    return amount > median * 5
      ? { outlier: true, message: `Usually around \u20B9${Math.round(median)}` }
      : { outlier: false };
  }

  const score = (0.6745 * (amount - median)) / mad;
  if (score > 6) {
    return {
      outlier: true,
      message: `Much larger than this customer's usual \u20B9${Math.round(median)}`,
    };
  }
  return { outlier: false };
}

/* ------------------------------------------------------------------ */
/*  Entry point                                                        */
/* ------------------------------------------------------------------ */

export function adjudicate(extraction: ExtractionResult): AdjudicatedRow[] {
  return extraction.entries.map((row: ExtractedRow, i) => {
    const fields: AdjudicatedRow["fields"] = {};
    const rowFlags: string[] = [];

    for (const key of FIELD_KEYS) {
      const cell = (row as unknown as Record<FieldKey, { value: unknown; confidence: number }>)[key];
      const mc = cell?.confidence ?? 0.4;
      const raw = cell?.value;

      let out: { value: string | number; verdict: Verdict };
      switch (key) {
        case "customer_name": out = adjudicateName(raw, mc); break;
        case "phone":         out = adjudicatePhone(raw, mc); break;
        case "date":          out = adjudicateDate(raw, mc); break;
        case "credit":        out = adjudicateAmount(raw, mc, "Credit"); break;
        case "payment":       out = adjudicateAmount(raw, mc, "Payment"); break;
        default:              out = adjudicateText(raw, mc);
      }
      fields[key] = out;
    }

    const credit = Number(fields.credit.value) || 0;
    const payment = Number(fields.payment.value) || 0;

    if (credit === 0 && payment === 0) {
      rowFlags.push("No credit and no payment — is this row worth saving?");
    }
    if (credit > 0 && payment > 0) {
      rowFlags.push("Both credit and payment on one row — check the columns weren't swapped");
    }

    return { _id: `row-${i}-${Date.now()}`, fields, rowFlags, balanceCheck: null };
  });
}
