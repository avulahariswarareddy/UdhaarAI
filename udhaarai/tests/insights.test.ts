import assert from "node:assert/strict";
import { businessHealth, customerTrust, reminderTiming, businessAdvisor, nextFestival } from "../src/lib/verify/insights";
import type { CustomerRow } from "../src/lib/verify/risk";

let passed = 0, failed = 0;
const out: string[] = [];
function t(name: string, fn: () => void) {
  try { fn(); passed++; out.push(`  PASS  ${name}`); }
  catch (e) { failed++; out.push(`  FAIL  ${name}\n        ${(e as Error).message.split("\n")[0]}`); }
}

const now = new Date("2026-07-27T12:00:00");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();
const cust = (o: Partial<CustomerRow>): CustomerRow => ({
  id: "x", name: "Test", phone: null, credit: 1000, paid: 500, outstanding: 500,
  last_entry: daysAgo(10), last_payment: daysAgo(10), entry_count: 5, first_entry: daysAgo(200), ...o,
});

/* ---- health score ---- */
t("healthy shop scores high", () => {
  const h = businessHealth({
    customers: [cust({ outstanding: 200, paid: 900, credit: 1000 }), cust({ id: "b", outstanding: 100 }), cust({ id: "c", outstanding: 150 })],
    monthCollected: 50000, monthCredit: 30000, monthExpenses: 20000,
  });
  assert.ok(h.score >= 62, `scored ${h.score}`);
  assert.ok(["excellent", "good"].includes(h.grade));
});
t("shop spending more than collecting scores low", () => {
  const h = businessHealth({
    customers: [cust({ last_payment: daysAgo(300) })],
    monthCollected: 10000, monthCredit: 40000, monthExpenses: 15000,
  });
  assert.ok(h.score < 50, `scored ${h.score}`);
});
t("health score always 0-100", () => {
  for (const mult of [0, 1, 10, 100]) {
    const h = businessHealth({ customers: [], monthCollected: 1000 * mult, monthCredit: 500 * mult, monthExpenses: 2000 * mult });
    assert.ok(h.score >= 0 && h.score <= 100);
  }
});
t("health factors explain the score", () => {
  const h = businessHealth({ customers: [cust({})], monthCollected: 50000, monthCredit: 20000, monthExpenses: 10000 });
  assert.ok(h.factors.length > 0);
  h.factors.forEach((f) => assert.ok(f.detail.length > 3));
});

/* ---- trust score ---- */
t("good payer is trusted", () => {
  const tr = customerTrust(cust({ credit: 10000, paid: 9500, outstanding: 500, last_payment: daysAgo(10), first_entry: daysAgo(400), entry_count: 25 }), now);
  assert.ok(tr.score >= 78, `scored ${tr.score}`);
  assert.equal(tr.band, "trusted");
});
t("never-paid customer is risky", () => {
  const tr = customerTrust(cust({ credit: 5000, paid: 0, outstanding: 5000, last_payment: null, first_entry: daysAgo(30) }), now);
  assert.ok(tr.score < 40, `scored ${tr.score}`);
  assert.ok(tr.reasons.some((r) => /never/i.test(r)));
});
t("trust score always 0-100", () => {
  const tr = customerTrust(cust({ credit: 999999, paid: 0, last_payment: null }), now);
  assert.ok(tr.score >= 0 && tr.score <= 100);
});

/* ---- reminder timing ---- */
t("settled customer: leave alone", () => {
  assert.equal(reminderTiming(cust({ outstanding: 0 }), now).urgency, "leave");
});
t("reliable but quiet: nudge now", () => {
  const r = reminderTiming(cust({ credit: 10000, paid: 9000, outstanding: 1000, last_payment: daysAgo(50), first_entry: daysAgo(400), entry_count: 25 }), now);
  assert.equal(r.urgency, "now");
});
t("recently paid: later", () => {
  const r = reminderTiming(cust({ outstanding: 500, last_payment: daysAgo(5), credit: 1000, paid: 800 }), now);
  assert.equal(r.urgency, "later");
});

/* ---- advisor ---- */
t("advisor suggests collection from quiet reliable payer", () => {
  const a = businessAdvisor({
    customers: [cust({ name: "Ravi", credit: 10000, paid: 8500, outstanding: 8500, last_payment: daysAgo(55), first_entry: daysAgo(400), entry_count: 25 })],
    monthCollected: 20000, monthCredit: 15000, monthExpenses: 8000,
  });
  assert.ok(a.some((x) => x.kind === "collect" && /Ravi/.test(x.text)));
});
t("advisor flags expense spike", () => {
  const a = businessAdvisor({
    customers: [], monthCollected: 30000, monthCredit: 10000, monthExpenses: 24000, prevMonthExpenses: 20000,
  });
  assert.ok(a.some((x) => x.kind === "expense" && /up \d+%/.test(x.text)));
});
t("advisor warns when credit outpaces collection", () => {
  const a = businessAdvisor({
    customers: [cust({ outstanding: 5000 })], monthCollected: 5000, monthCredit: 20000, monthExpenses: 3000,
  });
  assert.ok(a.some((x) => x.kind === "credit"));
});
t("advisor praises a good month when nothing is wrong", () => {
  const a = businessAdvisor({
    customers: [cust({ outstanding: 0, paid: 1000, credit: 1000, last_payment: daysAgo(5) })],
    monthCollected: 40000, monthCredit: 10000, monthExpenses: 8000,
  });
  assert.ok(a.length > 0);
});
t("advice is sorted by priority", () => {
  const a = businessAdvisor({
    customers: [cust({ name: "Ravi", credit: 10000, paid: 9000, outstanding: 8500, last_payment: daysAgo(70), first_entry: daysAgo(400), entry_count: 25 })],
    monthCollected: 5000, monthCredit: 20000, monthExpenses: 24000, prevMonthExpenses: 18000,
  });
  for (let i = 1; i < a.length; i++) assert.ok(a[i - 1].priority >= a[i].priority);
});

/* ---- festival ---- */
t("festival within window is found", () => {
  const f = nextFestival(new Date("2026-11-01"), 21); // Diwali ~Nov 8
  assert.ok(f && /Diwali/.test(f.name));
  assert.ok(f.inDays >= 0 && f.inDays <= 21);
});
t("no festival outside window returns null", () => {
  const f = nextFestival(new Date("2026-06-01"), 21);
  assert.equal(f, null);
});
t("festival across year boundary works", () => {
  const f = nextFestival(new Date("2026-12-30"), 21); // Sankranti Jan 14
  assert.ok(f && /Sankranti/.test(f.name));
});

console.log("\n" + out.join("\n"));
console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
