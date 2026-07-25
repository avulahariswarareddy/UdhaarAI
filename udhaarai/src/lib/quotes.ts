/**
 * Quote of the day.
 *
 * Original lines written for UdhaarAI — not scraped from the internet, so
 * there is no attribution or licensing question on a public submission.
 *
 * The selection is deterministic on the calendar day: everyone opening the
 * app on the same date sees the same quote, and it changes at local midnight
 * without a database, a cron job, or a random call that would flicker on
 * re-render. The index is derived from the day number so the sequence walks
 * the whole list before repeating rather than jumping around.
 */
export const QUOTES: readonly string[] = [
  "Great businesses aren't built overnight. They're built every single day.",
  "Cash flow is the heartbeat of every shop. Keep a finger on it.",
  "Small improvements, repeated daily, become a remarkable business.",
  "Every rupee written down is a rupee you'll actually collect.",
  "Trust brings the customer back. Records keep the business standing.",
  "Know your numbers before they surprise you.",
  "A tidy ledger is a clear mind.",
  "Discipline today is freedom tomorrow.",
  "The shop that measures is the shop that grows.",
  "Consistency beats intensity when you're building something to last.",
  "Today's careful record is next year's confident decision.",
  "Chase the oldest debt first — it's the one most likely to slip away.",
  "A customer remembered is a customer kept.",
  "Good books don't just track money. They reveal where it leaks.",
  "The best time to write it down was at the counter. The second best is now.",
  "Profit hides in the expenses you never bothered to record.",
  "A reminder sent kindly is a payment received sooner.",
  "You can't grow what you can't see.",
  "Slow to lend, quick to record, patient to collect.",
  "Every entry is a small promise you make to your future self.",
  "The notebook remembers what the mind forgets.",
  "Watch the small leaks; the big ones announce themselves.",
  "A settled account is a relationship, not just a number.",
  "Your ledger is the honest mirror of your shop.",
  "Money managed carefully has a way of multiplying quietly.",
  "The shopkeeper who knows their outstanding sleeps better.",
  "Write it once, and never argue about it later.",
  "Steady collection is worth more than a big, uncertain sale.",
  "A business runs on trust, but it survives on records.",
  "Count what matters, and what matters will grow.",
  "The best ledger is the one you actually keep.",
  "Fair prices, kind reminders, clear records — the whole craft of a good shop.",
] as const;

/** Days since the Unix epoch in the given timezone-free local sense. */
function dayIndex(d: Date): number {
  return Math.floor(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000
  );
}

export function quoteOfTheDay(now: Date = new Date()): { text: string; index: number } {
  const idx = ((dayIndex(now) % QUOTES.length) + QUOTES.length) % QUOTES.length;
  return { text: QUOTES[idx], index: idx };
}

/** "Monday, 27 July 2026" — no time, as specified. */
export function formatToday(now: Date = new Date()): string {
  return now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
