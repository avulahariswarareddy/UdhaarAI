/**
 * Indic numeral normalisation. Pure lookup — no model involved.
 *
 * Gemini usually transliterates Devanagari and Telugu digits, but "usually"
 * is not a guarantee, and a single untranslated digit silently corrupts an
 * amount. This runs on every numeric field regardless of what came back.
 */

const DIGIT_MAP: Record<string, string> = {};

// Devanagari ० - ९
"\u0966\u0967\u0968\u0969\u096A\u096B\u096C\u096D\u096E\u096F"
  .split("").forEach((c, i) => (DIGIT_MAP[c] = String(i)));

// Telugu ౦ - ౯
"\u0C66\u0C67\u0C68\u0C69\u0C6A\u0C6B\u0C6C\u0C6D\u0C6E\u0C6F"
  .split("").forEach((c, i) => (DIGIT_MAP[c] = String(i)));

// Kannada, Tamil, Gujarati, Bengali — border districts and migrant customers
"\u0CE6\u0CE7\u0CE8\u0CE9\u0CEA\u0CEB\u0CEC\u0CED\u0CEE\u0CEF"
  .split("").forEach((c, i) => (DIGIT_MAP[c] = String(i)));
"\u0BE6\u0BE7\u0BE8\u0BE9\u0BEA\u0BEB\u0BEC\u0BED\u0BEE\u0BEF"
  .split("").forEach((c, i) => (DIGIT_MAP[c] = String(i)));
"\u0AE6\u0AE7\u0AE8\u0AE9\u0AEA\u0AEB\u0AEC\u0AED\u0AEE\u0AEF"
  .split("").forEach((c, i) => (DIGIT_MAP[c] = String(i)));
"\u09E6\u09E7\u09E8\u09E9\u09EA\u09EB\u09EC\u09ED\u09EE\u09EF"
  .split("").forEach((c, i) => (DIGIT_MAP[c] = String(i)));

/** Rewrite any Indic digit as ASCII. Leaves everything else untouched. */
export function normaliseDigits(input: string): string {
  if (!input) return "";
  let out = "";
  for (const ch of input) out += DIGIT_MAP[ch] ?? ch;
  return out;
}

export function hasIndicDigits(input: string): boolean {
  if (!input) return false;
  for (const ch of input) if (DIGIT_MAP[ch] !== undefined) return true;
  return false;
}

/**
 * Parse an amount written the way shopkeepers actually write them:
 * "1,250", "1250/-", "Rs 450", "₹৪৫০", "450 rupees", "1.5k".
 * Returns null when there is genuinely no number, rather than guessing 0.
 */
export function parseAmount(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) && raw >= 0 ? raw : null;
  if (typeof raw !== "string") return null;

  let s = normaliseDigits(raw)
    .replace(/[\u20B9$]/g, "")
    .replace(/\brs\.?\b/gi, "")
    .replace(/\brupees?\b/gi, "")
    .replace(/\/-/g, "")
    .replace(/,/g, "")
    .trim();

  // "1.5k" / "2k"
  const k = s.match(/^(\d+(?:\.\d+)?)\s*k$/i);
  if (k) return Math.round(parseFloat(k[1]) * 1000);

  s = s.replace(/[^\d.]/g, "");
  if (!s) return null;

  // Two dots means it was never a decimal — "12.50.00" is noise.
  if ((s.match(/\./g) ?? []).length > 1) s = s.replace(/\./g, "");

  const n = parseFloat(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}
