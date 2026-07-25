import assert from "node:assert/strict";
import {
  summarise, recoveryRate, paymentModeBreakdown, expenseCategoryBreakdown, startOf,
} from "../src/lib/verify/analytics";
import { quoteOfTheDay, QUOTES, formatToday } from "../src/lib/quotes";

let passed = 0, failed = 0;
const out: string[] = [];
function t(name: string, fn: () => void) {
  try { fn(); passed++; out.push(`  PASS  ${name}`); }
  catch (e) { failed++; out.push(`  FAIL  ${name}\n        ${(e as Error).message.split("\n")[0]}`); }
}

const now = new Date("2026-07-27T12:00:00");
const iso = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400000).toISOString();

/* ---- summarise ---- */
t("month profit = collected − expenses", () => {
  const s = summarise(
    [{ credit: 0, payment: 5000, created_at: iso(2) }, { credit: 3000, payment: 0, created_at: iso(3) }],
    [{ amount: 1200, category: "Rent", spent_at: iso(1), created_at: iso(1) }],
    "month", now
  );
  assert.equal(s.collected, 5000);
  assert.equal(s.expenses, 1200);
  assert.equal(s.profit, 3800);
});
t("today window excludes yesterday", () => {
  const s = summarise(
    [{ credit: 0, payment: 999, created_at: iso(1) }, { credit: 0, payment: 100, created_at: iso(0) }],
    [], "today", now
  );
  assert.equal(s.collected, 100);
});
t("week starts Monday", () => {
  // 2026-07-27 is a Monday
  const wk = startOf("week", now);
  assert.equal(wk.getDay(), 1);
  assert.equal(wk.getDate(), 27);
});
t("empty data gives zeroes not NaN", () => {
  const s = summarise([], [], "month", now);
  assert.equal(s.profit, 0);
  assert.ok(Number.isFinite(s.profit));
});

/* ---- recovery rate ---- */
t("recovery rate is paid/credit", () => {
  assert.equal(recoveryRate([{ credit: 1000, payment: 400, created_at: iso(1) }]), 40);
});
t("recovery rate never exceeds 100", () => {
  assert.equal(recoveryRate([{ credit: 100, payment: 500, created_at: iso(1) }]), 100);
});
t("recovery rate with no credit is 0", () => {
  assert.equal(recoveryRate([{ credit: 0, payment: 0, created_at: iso(1) }]), 0);
});

/* ---- payment modes ---- */
t("payment modes grouped and sorted", () => {
  const b = paymentModeBreakdown([
    { credit: 0, payment: 100, payment_method: "UPI", created_at: iso(1) },
    { credit: 0, payment: 300, payment_method: "Cash", created_at: iso(1) },
    { credit: 0, payment: 50, payment_method: "UPI", created_at: iso(1) },
  ]);
  assert.equal(b[0].method, "Cash");
  assert.equal(b[1].method, "UPI");
  assert.equal(b[1].total, 150);
  assert.equal(b[1].count, 2);
});
t("null payment method defaults to Cash", () => {
  const b = paymentModeBreakdown([{ credit: 0, payment: 100, payment_method: null, created_at: iso(1) }]);
  assert.equal(b[0].method, "Cash");
});
t("credit-only rows are excluded from payment modes", () => {
  const b = paymentModeBreakdown([{ credit: 500, payment: 0, payment_method: "UPI", created_at: iso(1) }]);
  assert.equal(b.length, 0);
});
t("unknown method bucketed as Other", () => {
  const b = paymentModeBreakdown([{ credit: 0, payment: 100, payment_method: "Bitcoin", created_at: iso(1) }]);
  assert.equal(b[0].method, "Other");
});

/* ---- expenses ---- */
t("expense categories grouped", () => {
  const b = expenseCategoryBreakdown([
    { amount: 1000, category: "Rent", spent_at: iso(1), created_at: iso(1) },
    { amount: 200, category: "Electricity", spent_at: iso(1), created_at: iso(1) },
    { amount: 500, category: "Rent", spent_at: iso(1), created_at: iso(1) },
  ]);
  assert.equal(b[0].category, "Rent");
  assert.equal(b[0].total, 1500);
});

/* ---- quotes ---- */
t("at least 30 quotes", () => assert.ok(QUOTES.length >= 30));
t("quote is deterministic per day", () => {
  const a = quoteOfTheDay(new Date("2026-07-27T08:00:00"));
  const b = quoteOfTheDay(new Date("2026-07-27T22:00:00"));
  assert.equal(a.index, b.index);
});
t("quote changes across days", () => {
  const a = quoteOfTheDay(new Date("2026-07-27"));
  const b = quoteOfTheDay(new Date("2026-07-28"));
  assert.notEqual(a.index, b.index);
});
t("quote index always in range", () => {
  for (let d = 0; d < 400; d++) {
    const q = quoteOfTheDay(new Date(2026, 0, 1 + d));
    assert.ok(q.index >= 0 && q.index < QUOTES.length);
  }
});
t("today formats without time", () => {
  const s = formatToday(new Date("2026-07-27T14:30:00"));
  assert.ok(/2026/.test(s) && /July/.test(s));
  assert.ok(!/:/.test(s), "should not contain a time");
});

console.log("\n" + out.join("\n"));
console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
