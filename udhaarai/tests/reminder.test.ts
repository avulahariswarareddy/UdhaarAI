import assert from "node:assert/strict";
import { chooseTone, detectPlaceholders, validateReminder, factsToBrief, type ReminderFacts } from "../src/lib/verify/reminder-context";

let passed = 0, failed = 0;
const out: string[] = [];
function t(name: string, fn: () => void) {
  try { fn(); passed++; out.push(`  PASS  ${name}`); }
  catch (e) { failed++; out.push(`  FAIL  ${name}\n        ${(e as Error).message.split("\n")[0]}`); }
}

const facts = (o: Partial<ReminderFacts> = {}): ReminderFacts => ({
  customerName: "Ramesh Yadav", shopName: "Vedasri Traders",
  outstanding: 2350, lastPaymentAmount: 500, lastPaymentDate: "2026-07-12",
  daysSincePayment: 13, totalCredit: 10000, totalPaid: 7650, entryCount: 18,
  monthsAsCustomer: 14, recentItems: ["rice 5kg", "oil 1L"], customerNote: null,
  previousReminders: 0, daysSinceLastReminder: null, festival: null, ...o,
});

/* ---- tone selection ---- */
t("loyal reliable customer gets appreciative tone", () => {
  const { tone } = chooseTone(facts({ monthsAsCustomer: 14, totalCredit: 10000, totalPaid: 9000, daysSincePayment: 20 }));
  assert.equal(tone, "appreciative");
});
t("never-paid account gets professional tone", () => {
  const { tone } = chooseTone(facts({ daysSincePayment: null, totalPaid: 0, totalCredit: 5000, monthsAsCustomer: 2 }));
  assert.equal(tone, "professional");
});
t("very overdue gets professional tone", () => {
  const { tone } = chooseTone(facts({ daysSincePayment: 120, totalPaid: 1000, totalCredit: 10000, monthsAsCustomer: 3 }));
  assert.equal(tone, "professional");
});
t("recently slipped gets gentle tone", () => {
  const { tone } = chooseTone(facts({ daysSincePayment: 40, totalCredit: 10000, totalPaid: 3000, monthsAsCustomer: 3 }));
  assert.equal(tone, "gentle");
});
t("recent activity gets friendly tone", () => {
  const { tone } = chooseTone(facts({ daysSincePayment: 5, monthsAsCustomer: 2, totalCredit: 1000, totalPaid: 300 }));
  assert.equal(tone, "friendly");
});
t("imminent festival overrides other tones", () => {
  const { tone } = chooseTone(facts({ daysSincePayment: 200, festival: { name: "Diwali", inDays: 9 } }));
  assert.equal(tone, "festival");
});
t("distant festival does not override", () => {
  const { tone } = chooseTone(facts({ daysSincePayment: 200, totalPaid: 0, totalCredit: 5000, festival: { name: "Diwali", inDays: 20 } }));
  assert.notEqual(tone, "festival");
});
t("every tone choice carries a reason", () => {
  const r = chooseTone(facts());
  assert.ok(r.why.length > 5);
});

/* ---- placeholder detection ---- */
t("square-bracket placeholder caught", () => assert.ok(detectPlaceholders("Hello [Customer Name], you owe")));
t("curly-brace placeholder caught", () => assert.ok(detectPlaceholders("Hi {name}, balance is")));
t("double-brace placeholder caught", () => assert.ok(detectPlaceholders("Hi {{customer}}")));
t("angle-bracket placeholder caught", () => assert.ok(detectPlaceholders("Balance <amount> pending")));
t("literal 'customer name' caught", () => assert.ok(detectPlaceholders("Dear customer name, please pay")));
t("XXX caught", () => assert.ok(detectPlaceholders("Amount Rs XXX pending")));
t("real message passes clean", () => {
  assert.equal(detectPlaceholders("Hello Ramesh, your balance is Rs 2,350. Thank you."), null);
});
t("legitimate brackets in normal text not over-flagged", () => {
  assert.equal(detectPlaceholders("Hello Ramesh, balance Rs 2,350 (rice, oil). Thanks."), null);
});

/* ---- validation ---- */
t("good message validates", () => {
  const r = validateReminder("Hello Ramesh, your outstanding balance is Rs 2,350. Your last payment of Rs 500 came on 12 July. Please clear it when convenient. Thank you.", facts());
  assert.ok(r.ok, r.reason);
});
t("message without the customer name is rejected", () => {
  const r = validateReminder("Hello, your balance is Rs 2,350. Please pay soon.", facts());
  assert.equal(r.ok, false);
  assert.match(r.reason!, /name/);
});
t("message without the amount is rejected", () => {
  const r = validateReminder("Hello Ramesh, you have a pending balance. Please clear it.", facts());
  assert.equal(r.ok, false);
  assert.match(r.reason!, /balance/);
});
t("message with a placeholder is rejected", () => {
  const r = validateReminder("Hello [Customer], balance Rs 2,350 pending.", facts());
  assert.equal(r.ok, false);
  assert.match(r.reason!, /placeholder/);
});
t("threatening message is rejected", () => {
  const r = validateReminder("Ramesh, pay Rs 2,350 or we will take legal action.", facts());
  assert.equal(r.ok, false);
  assert.match(r.reason!, /threat/);
});
t("too-short message is rejected", () => {
  assert.equal(validateReminder("Pay up", facts()).ok, false);
});
t("Indian digit grouping accepted", () => {
  const r = validateReminder("Hello Ramesh, Rs 1,05,000 is pending. Thank you.", facts({ outstanding: 105000 }));
  assert.ok(r.ok, r.reason);
});
t("plain digits accepted", () => {
  const r = validateReminder("Hello Ramesh, Rs 2350 is pending. Thank you.", facts());
  assert.ok(r.ok, r.reason);
});
t("Hindi message with English name and numerals validates", () => {
  const r = validateReminder("नमस्ते Ramesh, आपका बकाया Rs 2,350 है। कृपया सुविधानुसार भुगतान करें। धन्यवाद।", facts());
  assert.ok(r.ok, r.reason);
});

/* ---- brief ---- */
t("brief includes the real last payment", () => {
  const b = factsToBrief(facts());
  assert.match(b, /Rs 500/);
  assert.match(b, /12 July/);
});
t("brief states when no payment exists", () => {
  const b = factsToBrief(facts({ lastPaymentAmount: null, lastPaymentDate: null, daysSincePayment: null }));
  assert.match(b, /none recorded/);
});
t("brief includes purchase history and notes", () => {
  const b = factsToBrief(facts({ customerNote: "Runs a tea stall nearby" }));
  assert.match(b, /rice 5kg/);
  assert.match(b, /tea stall/);
});
t("brief mentions prior reminders", () => {
  const b = factsToBrief(facts({ previousReminders: 2, daysSinceLastReminder: 9 }));
  assert.match(b, /Reminders already sent: 2/);
  assert.match(b, /9 days ago/);
});
t("brief never contains a placeholder", () => {
  assert.equal(detectPlaceholders(factsToBrief(facts({ customerNote: "likes credit" }))), null);
});

console.log("\n" + out.join("\n"));
console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
