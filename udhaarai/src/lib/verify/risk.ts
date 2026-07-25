/**
 * Collection risk scoring. Deterministic, explainable, no model.
 *
 * A model could produce a number here, but it would be unauditable and it
 * would drift between runs. A shopkeeper deciding who to chase today needs
 * the same answer every time, and needs to know why. So this is arithmetic
 * with named components, and the UI shows the breakdown.
 */

export type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  credit: number;
  paid: number;
  outstanding: number;
  last_entry: string | null;
  last_payment: string | null;
  entry_count: number;
  first_entry: string | null;
};

export type RiskAssessment = {
  score: number;              // 0 to 100, higher means chase sooner
  band: "watch" | "due" | "overdue" | "stale";
  components: { label: string; points: number; detail: string }[];
  daysSincePayment: number | null;
  recoveryRate: number;       // 0 to 1
  suggestedAction: string;
};

const DAY = 86400000;

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
}

export function assessRisk(c: CustomerRow): RiskAssessment {
  const components: RiskAssessment["components"] = [];
  const daysSincePayment = daysSince(c.last_payment);
  const daysSinceEntry = daysSince(c.last_entry);
  const recoveryRate = c.credit > 0 ? Math.min(1, c.paid / c.credit) : 1;

  let score = 0;

  /* --- 1. Age of the debt. The dominant factor, capped at 40. --- */
  if (c.outstanding > 0) {
    const age = daysSincePayment ?? daysSinceEntry ?? 0;
    // Rises steeply to 60 days, then flattens — beyond that it's already bad
    const agePoints = Math.min(40, Math.round(40 * (1 - Math.exp(-age / 45))));
    if (agePoints > 0) {
      score += agePoints;
      components.push({
        label: "Age of balance",
        points: agePoints,
        detail: daysSincePayment === null
          ? "Has never paid anything"
          : `${age} days since last payment`,
      });
    }
  }

  /* --- 2. Recovery rate. How much of what they took have they returned. --- */
  if (c.credit > 0) {
    const rrPoints = Math.round(25 * (1 - recoveryRate));
    if (rrPoints > 2) {
      score += rrPoints;
      components.push({
        label: "Repayment history",
        points: rrPoints,
        detail: `Repaid ${Math.round(recoveryRate * 100)}% of credit taken`,
      });
    }
  }

  /* --- 3. Size of exposure, on a log scale. A ₹50,000 balance is not
         ten times more urgent than ₹5,000, but it is more urgent. --- */
  if (c.outstanding > 0) {
    const sizePoints = Math.min(20, Math.round(Math.log10(c.outstanding + 1) * 5));
    score += sizePoints;
    components.push({
      label: "Amount outstanding",
      points: sizePoints,
      detail: `\u20B9${Math.round(c.outstanding).toLocaleString("en-IN")} pending`,
    });
  }

  /* --- 4. Still actively buying on credit while owing. --- */
  if (c.outstanding > 0 && daysSinceEntry !== null && daysSinceEntry < 14) {
    score += 10;
    components.push({
      label: "Still taking credit",
      points: 10,
      detail: "New entry in the last two weeks with a balance outstanding",
    });
  }

  /* --- 5. Thin history reduces confidence in the score itself. --- */
  if (c.entry_count < 3) {
    score = Math.round(score * 0.75);
    components.push({
      label: "Limited history",
      points: 0,
      detail: `Only ${c.entry_count} entries — score is less reliable`,
    });
  }

  score = Math.max(0, Math.min(100, score));

  let band: RiskAssessment["band"] = "watch";
  if (c.outstanding <= 0) band = "watch";
  else if (score >= 70) band = "stale";
  else if (score >= 45) band = "overdue";
  else if (score >= 20) band = "due";

  const suggestedAction =
    c.outstanding <= 0
      ? "Nothing pending"
      : band === "stale"
      ? "Visit in person or call — messages have not worked"
      : band === "overdue"
      ? "Send a firm reminder today"
      : band === "due"
      ? "A friendly reminder is appropriate"
      : "No action needed yet";

  return { score, band, components, daysSincePayment, recoveryRate, suggestedAction };
}

/** Ageing buckets, the way any accountant would expect to see them. */
export function ageingBuckets(customers: CustomerRow[]) {
  const buckets = [
    { label: "0-30 days", min: 0, max: 30, total: 0, count: 0 },
    { label: "31-60 days", min: 31, max: 60, total: 0, count: 0 },
    { label: "61-90 days", min: 61, max: 90, total: 0, count: 0 },
    { label: "Over 90 days", min: 91, max: Infinity, total: 0, count: 0 },
  ];

  for (const c of customers) {
    if (c.outstanding <= 0) continue;
    const age = daysSince(c.last_payment) ?? daysSince(c.last_entry) ?? 0;
    const b = buckets.find((x) => age >= x.min && age <= x.max);
    if (b) { b.total += c.outstanding; b.count += 1; }
  }
  return buckets;
}

/** Today's worklist: who to chase, in order, with a reason. */
export function collectionWorklist(customers: CustomerRow[], limit = 12) {
  return customers
    .filter((c) => c.outstanding > 0)
    .map((c) => ({ customer: c, risk: assessRisk(c) }))
    .sort((a, b) => b.risk.score - a.risk.score)
    .slice(0, limit);
}

/**
 * Expected recovery, from this shop's own history. No forecasting model —
 * just the observed rate at which balances of each age actually get paid.
 */
export function recoveryOutlook(customers: CustomerRow[]) {
  const active = customers.filter((c) => c.credit > 0);
  if (!active.length) return { rate: 0, atRisk: 0, likely: 0 };

  const rate = active.reduce((s, c) => s + Math.min(1, c.paid / c.credit), 0) / active.length;
  const outstanding = customers.reduce((s, c) => s + Math.max(0, c.outstanding), 0);

  return {
    rate,
    likely: Math.round(outstanding * rate),
    atRisk: Math.round(outstanding * (1 - rate)),
  };
}
