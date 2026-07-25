/**
 * Risk scorer tests. This is the module that replaces "ask the model who to
 * chase" with an explainable calculation, so its ordering has to be right.
 */
import assert from "node:assert/strict";
import { assessRisk, ageingBuckets, collectionWorklist, recoveryOutlook, type CustomerRow } from "../src/lib/verify/risk";

let passed = 0, failed = 0;
const out: string[] = [];
function t(name: string, fn: () => void) {
  try { fn(); passed++; out.push(`  PASS  ${name}`); }
  catch (e) { failed++; out.push(`  FAIL  ${name}\n        ${(e as Error).message.split("\n")[0]}`); }
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

function customer(over: Partial<CustomerRow>): CustomerRow {
  return {
    id: "x", name: "Test", phone: null,
    credit: 1000, paid: 0, outstanding: 1000,
    last_entry: daysAgo(10), last_payment: daysAgo(10),
    entry_count: 3, first_entry: daysAgo(60),
    ...over,
  };
}

/* --- ordering --- */
t("settled customer scores zero-ish and is excluded from worklist", () => {
  const c = customer({ outstanding: 0, paid: 1000 });
  assert.equal(collectionWorklist([c]).length, 0);
});
t("older debt outranks newer debt of the same size", () => {
  const old = customer({ id: "old", last_payment: daysAgo(120), last_entry: daysAgo(120) });
  const recent = customer({ id: "new", last_payment: daysAgo(5), last_entry: daysAgo(5) });
  assert.ok(assessRisk(old).score > assessRisk(recent).score);
});
t("larger balance outranks smaller at the same age", () => {
  const big = customer({ id: "big", outstanding: 20000, credit: 20000 });
  const small = customer({ id: "small", outstanding: 500, credit: 500 });
  assert.ok(assessRisk(big).score > assessRisk(small).score);
});
t("good repayment history lowers the score", () => {
  const payer = customer({ credit: 10000, paid: 9000, outstanding: 1000 });
  const never = customer({ credit: 10000, paid: 0, outstanding: 10000 });
  assert.ok(assessRisk(payer).score < assessRisk(never).score);
});
t("never-paid customer is described as such", () => {
  const c = customer({ last_payment: null, paid: 0 });
  const r = assessRisk(c);
  assert.ok(r.components.some((x) => /never paid/i.test(x.detail)), JSON.stringify(r.components));
});
t("score stays within 0-100", () => {
  const worst = customer({ outstanding: 500000, credit: 500000, paid: 0, last_payment: null, last_entry: daysAgo(900) });
  const r = assessRisk(worst);
  assert.ok(r.score >= 0 && r.score <= 100, `score was ${r.score}`);
});
t("every score carries at least one stated reason", () => {
  const r = assessRisk(customer({ last_payment: daysAgo(90) }));
  assert.ok(r.components.length > 0);
  r.components.forEach((c) => assert.ok(c.detail.length > 3, "component has no explanation"));
});
t("band escalates with age", () => {
  const fresh = assessRisk(customer({ last_payment: daysAgo(2), last_entry: daysAgo(2), outstanding: 200, credit: 200 }));
  const stale = assessRisk(customer({ last_payment: daysAgo(300), last_entry: daysAgo(300) }));
  const order = ["watch", "due", "overdue", "stale"];
  assert.ok(order.indexOf(stale.band) > order.indexOf(fresh.band), `${fresh.band} -> ${stale.band}`);
});

/* --- ageing buckets --- */
t("ageing buckets place customers correctly", () => {
  const rows = [
    customer({ id: "a", last_payment: daysAgo(10), outstanding: 100 }),
    customer({ id: "b", last_payment: daysAgo(45), outstanding: 200 }),
    customer({ id: "c", last_payment: daysAgo(75), outstanding: 300 }),
    customer({ id: "d", last_payment: daysAgo(200), outstanding: 400 }),
  ];
  const b = ageingBuckets(rows);
  assert.equal(b[0].total, 100);
  assert.equal(b[1].total, 200);
  assert.equal(b[2].total, 300);
  assert.equal(b[3].total, 400);
});
t("settled customers do not appear in ageing", () => {
  const b = ageingBuckets([customer({ outstanding: 0 })]);
  assert.equal(b.reduce((s, x) => s + x.count, 0), 0);
});
t("ageing totals reconcile with outstanding sum", () => {
  const rows = [
    customer({ id: "a", last_payment: daysAgo(5), outstanding: 111 }),
    customer({ id: "b", last_payment: daysAgo(65), outstanding: 222 }),
  ];
  const total = ageingBuckets(rows).reduce((s, x) => s + x.total, 0);
  assert.equal(total, 333);
});

/* --- outlook --- */
t("recovery outlook splits outstanding into likely and at-risk", () => {
  const rows = [customer({ credit: 1000, paid: 500, outstanding: 500 })];
  const o = recoveryOutlook(rows);
  assert.ok(Math.abs(o.rate - 0.5) < 0.01);
  assert.equal(o.likely + o.atRisk, 500);
});
t("outlook on empty ledger does not divide by zero", () => {
  const o = recoveryOutlook([]);
  assert.equal(Number.isFinite(o.rate), true);
  assert.equal(o.likely, 0);
});
t("worklist is ordered strictly by descending score", () => {
  const rows = [
    customer({ id: "a", last_payment: daysAgo(3), outstanding: 100, credit: 100 }),
    customer({ id: "b", last_payment: daysAgo(200), outstanding: 9000, credit: 9000 }),
    customer({ id: "c", last_payment: daysAgo(40), outstanding: 1500, credit: 1500 }),
  ];
  const w = collectionWorklist(rows);
  for (let i = 1; i < w.length; i++) {
    assert.ok(w[i - 1].risk.score >= w[i].risk.score, "worklist out of order");
  }
  assert.equal(w[0].customer.id, "b");
});

console.log("\n" + out.join("\n"));
console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
