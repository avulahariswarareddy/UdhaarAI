export const CONFIDENCE_THRESHOLD = 0.75;

export function rupee(n: number | string | null | undefined) {
  const v = Number(n) || 0;
  return "\u20B9" + v.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/** Strip anything that could be interpreted as markup before it is stored. */
export function sanitizeText(input: unknown, max = 500): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[<>]/g, "")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, max);
}

export function toAmount(input: unknown): number {
  const n = Number(String(input ?? "").replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

/** Best-effort parse of a handwritten date. Returns null rather than guessing a year. */
export function parseLooseDate(text: string): string | null {
  if (!text) return null;
  const m = text.match(/(\d{1,2})\s*[-/.]\s*(\d{1,2})(?:\s*[-/.]\s*(\d{2,4}))?/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  let year = m[3] ? Number(m[3]) : new Date().getFullYear();
  if (year < 100) year += 2000;
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

export function timeAgo(iso: string | null) {
  if (!iso) return "never";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "a month ago" : `${months} months ago`;
}
