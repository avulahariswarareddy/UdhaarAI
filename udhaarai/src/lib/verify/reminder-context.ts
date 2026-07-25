/**
 * Reminder context — everything the model needs to write ONE specific
 * message for ONE specific customer, plus the guards around what it returns.
 *
 * Two deliberate choices:
 *
 * 1. **Tone is chosen by code, not by the model.** "Adjust the tone based on
 *    the customer's history" is a rule, and rules belong in tested code. A
 *    loyal customer who paid last week and a stranger who has never paid get
 *    measurably different messages, every time, for reasons you can read.
 *
 * 2. **The output is validated before it reaches the shopkeeper.** A model
 *    that emits "[Customer Name]" or "Dear {name}" has failed, and shipping
 *    that to a real customer is worse than any error message. detectPlaceholders
 *    catches it and the route regenerates.
 */

export type Lang = "en" | "hi" | "te";
export type Tone = "appreciative" | "friendly" | "gentle" | "professional" | "festival";

export type ReminderFacts = {
  customerName: string;
  shopName: string;
  outstanding: number;
  lastPaymentAmount: number | null;
  lastPaymentDate: string | null;   // ISO
  daysSincePayment: number | null;  // null = never paid
  totalCredit: number;
  totalPaid: number;
  entryCount: number;
  monthsAsCustomer: number;
  recentItems: string[];
  customerNote: string | null;
  previousReminders: number;
  daysSinceLastReminder: number | null;
  festival: { name: string; inDays: number } | null;
};

/* ------------------------------------------------------------------ */
/*  Tone selection — deterministic, from the customer's actual history  */
/* ------------------------------------------------------------------ */
export function chooseTone(f: ReminderFacts): { tone: Tone; why: string } {
  const repaidRatio = f.totalCredit > 0 ? f.totalPaid / f.totalCredit : 0;
  const days = f.daysSincePayment;

  // A festival within a fortnight reframes the whole message.
  if (f.festival && f.festival.inDays <= 14) {
    return { tone: "festival", why: `${f.festival.name} is ${f.festival.inDays} days away` };
  }

  // Long-standing, reliable, and only recently overdue — thank them first.
  if (f.monthsAsCustomer >= 6 && repaidRatio >= 0.8 && (days === null || days <= 45)) {
    return { tone: "appreciative", why: "Long-standing customer who repays reliably" };
  }

  // Never paid anything, or silent for a very long time — businesslike.
  if (days === null && f.totalPaid === 0 && f.totalCredit > 0) {
    return { tone: "professional", why: "No payment recorded against this account yet" };
  }
  if (days !== null && days > 90) {
    return { tone: "professional", why: `No payment for ${days} days` };
  }

  // Slipped recently — a soft nudge is enough.
  if (days !== null && days > 30) {
    return { tone: "gentle", why: `Last paid ${days} days ago` };
  }

  return { tone: "friendly", why: "Recent activity on the account" };
}

/* ------------------------------------------------------------------ */
/*  Placeholder detection                                              */
/* ------------------------------------------------------------------ */
const PLACEHOLDER_PATTERNS: RegExp[] = [
  /\[[^\]]{2,40}\]/,                       // [Customer Name]
  /\{\{?[^}]{2,40}\}?\}/,                  // {name} or {{name}}
  /<[^>]{2,40}>/,                          // <amount>
  /\b(customer[_ ]?name|shop[_ ]?name|your[_ ]?name)\b/i,
  /\bXXX+\b/,
  /\bLorem ipsum\b/i,
  /\b(insert|enter)\s+(the\s+)?(name|amount|date)\b/i,
  /\bRs\.?\s*(amount|X+)\b/i,
];

export function detectPlaceholders(text: string): string | null {
  for (const re of PLACEHOLDER_PATTERNS) {
    const m = re.exec(text);
    if (m) return m[0];
  }
  return null;
}

/**
 * A message is only usable if it actually names this customer and states a
 * real number. Anything generic has failed the brief.
 */
export function validateReminder(text: string, f: ReminderFacts): { ok: boolean; reason?: string } {
  const t = (text ?? "").trim();
  if (t.length < 15) return { ok: false, reason: "too short" };
  if (t.length > 600) return { ok: false, reason: "too long" };

  const ph = detectPlaceholders(t);
  if (ph) return { ok: false, reason: `contains placeholder ${ph}` };

  // The customer's given name must appear (any script — we compare loosely).
  const first = f.customerName.trim().split(/\s+/)[0];
  if (first.length >= 3 && !t.toLowerCase().includes(first.toLowerCase())) {
    return { ok: false, reason: "does not name the customer" };
  }

  // The outstanding amount must appear, in some digit grouping.
  const amt = Math.round(f.outstanding);
  const variants = [
    String(amt),
    amt.toLocaleString("en-IN"),
    amt.toLocaleString("en-US"),
  ];
  const digitsOnly = t.replace(/[,\s]/g, "");
  const hasAmount = variants.some((v) => t.includes(v)) || digitsOnly.includes(String(amt));
  if (amt > 0 && !hasAmount) return { ok: false, reason: "does not state the balance" };

  // Nothing threatening, ever.
  if (/\b(legal action|police|court|lawyer|consequence|blacklist|shame)\b/i.test(t)) {
    return { ok: false, reason: "contains a threat" };
  }

  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  A human-readable brief for the model                               */
/* ------------------------------------------------------------------ */
export function factsToBrief(f: ReminderFacts): string {
  const inr = (n: number) => `Rs ${Math.round(n).toLocaleString("en-IN")}`;
  const lines: string[] = [
    `Shop: ${f.shopName}`,
    `Customer: ${f.customerName}`,
    `Outstanding balance: ${inr(f.outstanding)}`,
  ];

  if (f.lastPaymentAmount && f.lastPaymentDate) {
    const d = new Date(f.lastPaymentDate).toLocaleDateString("en-IN", { day: "numeric", month: "long" });
    lines.push(`Last payment: ${inr(f.lastPaymentAmount)} received on ${d}`);
  } else {
    lines.push("Last payment: none recorded against this account");
  }

  if (f.daysSincePayment !== null) lines.push(`Days since that payment: ${f.daysSincePayment}`);
  if (f.monthsAsCustomer >= 1) lines.push(`Customer for about ${f.monthsAsCustomer} months, ${f.entryCount} entries`);
  if (f.totalCredit > 0) {
    lines.push(`Lifetime: ${inr(f.totalCredit)} of credit given, ${inr(f.totalPaid)} repaid`);
  }
  if (f.recentItems.length) lines.push(`Recently bought: ${f.recentItems.slice(0, 4).join(", ")}`);
  if (f.customerNote) lines.push(`Shopkeeper's note about them: ${f.customerNote}`);
  if (f.previousReminders > 0) {
    lines.push(
      `Reminders already sent: ${f.previousReminders}` +
      (f.daysSinceLastReminder !== null ? ` (most recent ${f.daysSinceLastReminder} days ago)` : "")
    );
  }
  if (f.festival) lines.push(`Upcoming festival: ${f.festival.name} in ${f.festival.inDays} days`);

  return lines.join("\n");
}
