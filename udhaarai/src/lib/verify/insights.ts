/**
 * Business intelligence — the "AI" features, done as explainable arithmetic.
 *
 * The prompt asks for a Health Score, a Trust Score, Smart Reminder Timing,
 * a Business Advisor, and more. The honest way to build these is as
 * transparent calculations over the shop's own ledger, each carrying the
 * reason it reached its number. A shopkeeper acting on "collect from Ravi
 * this week" deserves to see WHY, and a score with no derivation is just a
 * random number wearing a lab coat.
 *
 * Nothing here calls a model. Every function is pure and tested.
 */

import type { CustomerRow } from "./risk";
import { assessRisk } from "./risk";

/* ================================================================== */
/*  Business Health Score — one 0-100 number for the whole shop        */
/* ================================================================== */
export type HealthScore = {
  score: number;
  grade: "excellent" | "good" | "fair" | "needs attention";
  factors: { label: string; detail: string; delta: number }[];
};

export function businessHealth(input: {
  customers: CustomerRow[];
  monthCollected: number;
  monthCredit: number;
  monthExpenses: number;
}): HealthScore {
  const { customers, monthCollected, monthCredit, monthExpenses } = input;
  const factors: HealthScore["factors"] = [];
  let score = 50; // neutral start

  // 1. Collection vs credit this month — is money coming back faster than it goes out?
  if (monthCredit > 0) {
    const ratio = monthCollected / monthCredit;
    if (ratio >= 1.1) { score += 18; factors.push({ label: "Collection", detail: "Collecting faster than lending", delta: 18 }); }
    else if (ratio >= 0.9) { score += 10; factors.push({ label: "Collection", detail: "Collection keeping pace with credit", delta: 10 }); }
    else if (ratio >= 0.6) { score += 2; factors.push({ label: "Collection", detail: "Lending a little faster than collecting", delta: 2 }); }
    else { score -= 12; factors.push({ label: "Collection", detail: "Credit growing faster than collection", delta: -12 }); }
  } else if (monthCollected > 0) {
    score += 12; factors.push({ label: "Collection", detail: "Collecting with no new credit given", delta: 12 });
  }

  // 2. Profitability — did the shop keep money after expenses?
  const kept = monthCollected - monthExpenses;
  if (monthCollected > 0) {
    const margin = kept / monthCollected;
    if (margin >= 0.4) { score += 16; factors.push({ label: "Profit", detail: "Healthy margin after expenses", delta: 16 }); }
    else if (margin >= 0.15) { score += 8; factors.push({ label: "Profit", detail: "Positive margin after expenses", delta: 8 }); }
    else if (margin >= 0) { score += 2; factors.push({ label: "Profit", detail: "Just above break-even", delta: 2 }); }
    else { score -= 14; factors.push({ label: "Profit", detail: "Spending more than collecting", delta: -14 }); }
  }

  // 3. Concentration risk — how much is tied up in the top 2 debtors?
  const withBalance = customers.filter((c) => c.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding);
  const totalOut = withBalance.reduce((s, c) => s + c.outstanding, 0);
  if (totalOut > 0 && withBalance.length >= 3) {
    const top2 = (withBalance[0].outstanding + (withBalance[1]?.outstanding ?? 0)) / totalOut;
    if (top2 > 0.6) { score -= 10; factors.push({ label: "Concentration", detail: "Most credit sits with two customers", delta: -10 }); }
    else { score += 6; factors.push({ label: "Concentration", detail: "Credit spread across customers", delta: 6 }); }
  }

  // 4. Stale debt — anything gone quiet for months drags the score.
  const stale = withBalance.filter((c) => assessRisk(c).band === "stale");
  if (stale.length > 0) {
    const hit = Math.min(12, stale.length * 4);
    score -= hit;
    factors.push({ label: "Ageing", detail: `${stale.length} balance${stale.length > 1 ? "s" : ""} gone quiet for months`, delta: -hit });
  } else if (withBalance.length > 0) {
    score += 6; factors.push({ label: "Ageing", detail: "No long-overdue balances", delta: 6 });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const grade = score >= 80 ? "excellent" : score >= 62 ? "good" : score >= 42 ? "fair" : "needs attention";
  return { score, grade, factors: factors.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)) };
}

/* ================================================================== */
/*  Customer Trust Score — how reliably does this one customer repay?  */
/* ================================================================== */
export type TrustScore = {
  score: number;
  band: "trusted" | "reliable" | "watch" | "risky";
  reasons: string[];
};

export function customerTrust(c: CustomerRow, now = new Date()): TrustScore {
  const reasons: string[] = [];
  let score = 55;

  // repayment ratio
  if (c.credit > 0) {
    const repaid = c.paid / c.credit;
    if (repaid >= 0.9) { score += 22; reasons.push("Repays almost everything they take"); }
    else if (repaid >= 0.6) { score += 12; reasons.push("Repays most of their credit"); }
    else if (repaid >= 0.3) { score += 2; reasons.push("Repays some of their credit"); }
    else { score -= 14; reasons.push("Has repaid little so far"); }
  }

  // relationship length — long-standing customers earn trust
  if (c.first_entry) {
    const months = (now.getTime() - new Date(c.first_entry).getTime()) / (30 * 86400000);
    if (months >= 12) { score += 14; reasons.push("A customer for over a year"); }
    else if (months >= 6) { score += 8; reasons.push("A customer for several months"); }
    else if (months >= 1) { score += 3; reasons.push("A relatively new customer"); }
    else { reasons.push("Brand new customer"); }
  }

  // recency of last payment
  if (c.last_payment) {
    const days = (now.getTime() - new Date(c.last_payment).getTime()) / 86400000;
    if (days <= 30) { score += 12; reasons.push("Paid within the last month"); }
    else if (days <= 90) { score += 4; reasons.push("Paid within the last quarter"); }
    else if (days <= 180) { score -= 6; reasons.push("Hasn't paid in a few months"); }
    else { score -= 16; reasons.push("Hasn't paid in over six months"); }
  } else if (c.credit > 0) {
    score -= 18; reasons.push("Has never made a payment");
  }

  // volume of dealings — more history is more signal
  if (c.entry_count >= 20) { score += 6; reasons.push("A long history of transactions"); }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const band = score >= 78 ? "trusted" : score >= 58 ? "reliable" : score >= 38 ? "watch" : "risky";
  return { score, band, reasons };
}

/* ================================================================== */
/*  Smart Reminder Timing — when is this customer most worth nudging?   */
/* ================================================================== */
export function reminderTiming(c: CustomerRow, now = new Date()): {
  urgency: "now" | "soon" | "later" | "leave";
  reason: string;
} {
  if (c.outstanding <= 0) return { urgency: "leave", reason: "Nothing outstanding" };

  const daysSincePayment = c.last_payment
    ? (now.getTime() - new Date(c.last_payment).getTime()) / 86400000
    : 999;

  const trust = customerTrust(c, now);

  // Reliable payers who've simply gone a bit quiet: a gentle nudge lands well.
  if (trust.band === "trusted" || trust.band === "reliable") {
    if (daysSincePayment > 45) return { urgency: "now", reason: "Usually reliable but quiet for over six weeks — a nudge should work" };
    if (daysSincePayment > 25) return { urgency: "soon", reason: "Reliable payer, approaching their usual gap" };
    return { urgency: "later", reason: "Paid recently — no need to push yet" };
  }

  // Risky customers: chase the largest and oldest first.
  if (daysSincePayment > 60) return { urgency: "now", reason: "Overdue and not a consistent payer — chase this week" };
  if (daysSincePayment > 30) return { urgency: "soon", reason: "Slipping — worth a reminder soon" };
  return { urgency: "later", reason: "Recent activity — watch for now" };
}

/* ================================================================== */
/*  AI Business Advisor — proactive, ranked, plain-English advice       */
/* ================================================================== */
export type Advice = {
  kind: "collect" | "expense" | "credit" | "festival" | "praise";
  priority: number; // higher = show first
  text: string;
};

export function businessAdvisor(input: {
  customers: CustomerRow[];
  monthCollected: number;
  monthCredit: number;
  monthExpenses: number;
  prevMonthExpenses?: number;
  now?: Date;
}): Advice[] {
  const { customers, monthCollected, monthCredit, monthExpenses, prevMonthExpenses, now = new Date() } = input;
  const advice: Advice[] = [];
  const inr = (n: number) => `\u20B9${Math.round(n).toLocaleString("en-IN")}`;

  // 1. Best collection opportunity: a reliable payer who's gone quiet.
  const collectFrom = customers
    .filter((c) => c.outstanding > 0)
    .map((c) => ({ c, t: customerTrust(c, now), timing: reminderTiming(c, now) }))
    .filter((x) => x.timing.urgency === "now")
    .sort((a, b) => b.c.outstanding - a.c.outstanding)[0];
  if (collectFrom) {
    const { c, t } = collectFrom;
    const reliable = t.band === "trusted" || t.band === "reliable";
    advice.push({
      kind: "collect", priority: 90,
      text: `Collect from ${c.name} this week — ${inr(c.outstanding)} outstanding${reliable ? ", and they usually pay on time" : ", and it's been a while"}.`,
    });
  }

  // 2. Expense spike vs last month.
  if (prevMonthExpenses && prevMonthExpenses > 0) {
    const change = (monthExpenses - prevMonthExpenses) / prevMonthExpenses;
    if (change > 0.15) {
      advice.push({
        kind: "expense", priority: 70,
        text: `Your expenses are up ${Math.round(change * 100)}% on last month. Worth checking where the extra ${inr(monthExpenses - prevMonthExpenses)} went.`,
      });
    }
  }

  // 3. Outstanding growing faster than collection.
  if (monthCredit > monthCollected * 1.25 && monthCredit > 0) {
    const toChase = customers.filter((c) => c.outstanding > 0).length;
    advice.push({
      kind: "credit", priority: 80,
      text: `You're giving credit faster than you're collecting it. Consider reminders for the ${toChase} customer${toChase === 1 ? "" : "s"} still carrying a balance.`,
    });
  }

  // 4. Festival window — collect before extending fresh credit.
  const festival = nextFestival(now);
  if (festival) {
    advice.push({
      kind: "festival", priority: 60,
      text: `${festival.name} is around ${festival.inDays} day${festival.inDays === 1 ? "" : "s"} away. Collect pending balances before customers ask for festival credit.`,
    });
  }

  // 5. Praise when things are healthy — don't only nag.
  if (advice.length === 0 && monthCollected > monthCredit && monthCollected > 0) {
    advice.push({
      kind: "praise", priority: 40,
      text: `A solid month — you collected ${inr(monthCollected)} against ${inr(monthCredit)} of new credit. Keep the momentum on the few remaining balances.`,
    });
  }

  return advice.sort((a, b) => b.priority - a.priority);
}

/* ================================================================== */
/*  Festival Intelligence — the next major Indian festival             */
/* ================================================================== */
type Festival = { name: string; inDays: number };

// Approximate dates for the coming window. Kept small and honest — these are
// the festivals a kirana shop plans credit around. Dates are indicative.
const FESTIVALS_2026: { name: string; month: number; day: number }[] = [
  { name: "Ugadi", month: 3, day: 19 },
  { name: "Ram Navami", month: 3, day: 26 },
  { name: "Raksha Bandhan", month: 8, day: 28 },
  { name: "Ganesh Chaturthi", month: 9, day: 14 },
  { name: "Dussehra", month: 10, day: 20 },
  { name: "Diwali", month: 11, day: 8 },
  { name: "Sankranti", month: 1, day: 14 },
];

export function nextFestival(now = new Date(), windowDays = 21): Festival | null {
  const year = now.getFullYear();
  let best: Festival | null = null;
  for (const f of FESTIVALS_2026) {
    for (const y of [year, year + 1]) {
      const date = new Date(y, f.month - 1, f.day);
      const inDays = Math.ceil((date.getTime() - now.getTime()) / 86400000);
      if (inDays >= 0 && inDays <= windowDays) {
        if (!best || inDays < best.inDays) best = { name: f.name, inDays };
      }
    }
  }
  return best;
}
