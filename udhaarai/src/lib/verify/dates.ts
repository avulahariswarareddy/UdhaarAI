import { normaliseDigits } from "./numerals";

/**
 * Handwritten date parsing. Indian notebooks are day-first, almost always.
 * Returns null rather than inventing a year — a wrong date silently
 * reorders a customer's history.
 */

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  // Hindi
  "\u091C\u0928": 1, "\u092B\u0930": 2, "\u092E\u093E\u0930\u094D\u091A": 3,
  // Telugu
  "\u0C1C\u0C28": 1, "\u0C2B\u0C3F\u0C2C\u0C4D\u0C30": 2,
};

export type DateCheck = {
  iso: string | null;
  valid: boolean;
  reason?: string;
};

export function checkDate(raw: unknown, pageYearHint?: number): DateCheck {
  if (typeof raw !== "string" || !raw.trim()) return { iso: null, valid: true };

  const s = normaliseDigits(raw).toLowerCase().trim();
  const thisYear = new Date().getFullYear();

  let day: number | null = null;
  let month: number | null = null;
  let year: number | null = null;

  // 12/03/24, 12-3-2024, 12.03
  const numeric = s.match(/(\d{1,2})\s*[-/.]\s*(\d{1,2})(?:\s*[-/.]\s*(\d{2,4}))?/);
  if (numeric) {
    day = Number(numeric[1]);
    month = Number(numeric[2]);
    if (numeric[3]) year = Number(numeric[3]);
  } else {
    // 12 Mar 24 / 12 मार्च
    const named = s.match(/(\d{1,2})\s*([a-z\u0900-\u097F\u0C00-\u0C7F]{2,9})\.?\s*(\d{2,4})?/);
    if (named) {
      day = Number(named[1]);
      const key = Object.keys(MONTHS).find((m) => named[2].startsWith(m));
      month = key ? MONTHS[key] : null;
      if (named[3]) year = Number(named[3]);
    }
  }

  if (day === null || month === null) {
    return { iso: null, valid: false, reason: "no readable date" };
  }

  // Day and month swapped (US-style entry, or a misread)
  if (month > 12 && day <= 12) [day, month] = [month, day];

  if (month < 1 || month > 12) return { iso: null, valid: false, reason: "month out of range" };
  if (day < 1 || day > 31) return { iso: null, valid: false, reason: "day out of range" };

  if (year === null) year = pageYearHint ?? thisYear;
  if (year < 100) year += year > 70 ? 1900 : 2000;

  // Real calendar check — catches 31 Feb
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return { iso: null, valid: false, reason: "not a real date" };
  }
  if (year < 1990 || year > thisYear + 1) {
    return { iso: null, valid: false, reason: `year ${year} looks wrong` };
  }

  return { iso: d.toISOString().slice(0, 10), valid: true };
}
