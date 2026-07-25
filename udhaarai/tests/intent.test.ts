import assert from "node:assert/strict";
import { parseIntent, detectLang } from "../src/lib/verify/intent";

let passed = 0, failed = 0;
const out: string[] = [];
function t(name: string, fn: () => void) {
  try { fn(); passed++; out.push(`  PASS  ${name}`); }
  catch (e) { failed++; out.push(`  FAIL  ${name}\n        ${(e as Error).message.split("\n")[0]}`); }
}

/* ---- language detection ---- */
t("detects English", () => assert.equal(detectLang("Ramesh paid 500"), "en"));
t("detects Hindi", () => assert.equal(detectLang("रमेश ने आज ₹500 दिए"), "hi"));
t("detects Telugu", () => assert.equal(detectLang("రమేష్ ఈరోజు ₹500 చెల్లించాడు"), "te"));

/* ---- payment: English ---- */
t("payment: Ramesh paid 500", () => {
  const p = parseIntent("Ramesh paid ₹500 today");
  assert.equal(p.kind, "record_payment");
  assert.equal(p.slots.customerName, "Ramesh");
  assert.equal(p.slots.amount, 500);
  assert.ok(p.confidence >= 0.9);
});
t("payment: with method", () => {
  const p = parseIntent("Suresh paid 1200 via UPI");
  assert.equal(p.kind, "record_payment");
  assert.equal(p.slots.method, "UPI");
  assert.equal(p.slots.amount, 1200);
});
t("payment: 1.5k shorthand", () => {
  const p = parseIntent("Lakshmi paid 1.5k");
  assert.equal(p.slots.amount, 1500);
});
t("payment: comma amount", () => {
  const p = parseIntent("Venkat gave 2,300 cash");
  assert.equal(p.slots.amount, 2300);
  assert.equal(p.slots.method, "Cash");
});
t("payment: missing amount flagged", () => {
  const p = parseIntent("Ramesh paid");
  assert.equal(p.kind, "record_payment");
  assert.ok(p.missing.includes("amount"));
});

/* ---- payment: Hindi & Telugu ---- */
t("payment Hindi: रमेश ने ₹500 दिए", () => {
  const p = parseIntent("रमेश ने आज ₹500 दिए");
  assert.equal(p.kind, "record_payment");
  assert.equal(p.lang, "hi");
  assert.equal(p.slots.amount, 500);
  assert.ok(p.slots.customerName);
});
t("payment Telugu: రమేష్ ₹500 చెల్లించాడు", () => {
  const p = parseIntent("రమేష్ ఈరోజు ₹500 చెల్లించాడు");
  assert.equal(p.kind, "record_payment");
  assert.equal(p.lang, "te");
  assert.equal(p.slots.amount, 500);
});
t("payment Hindi: Devanagari digits", () => {
  const p = parseIntent("सुरेश ने ५०० दिए");
  assert.equal(p.slots.amount, 500);
});

/* ---- add customer ---- */
t("add customer: English named", () => {
  const p = parseIntent("Add a new customer called Suresh");
  assert.equal(p.kind, "add_customer");
  assert.equal(p.slots.customerName, "Suresh");
});
t("add customer: no name flagged", () => {
  const p = parseIntent("add a new customer");
  assert.equal(p.kind, "add_customer");
  assert.ok(p.missing.includes("customerName"));
});
t("add customer Hindi", () => {
  const p = parseIntent("नया ग्राहक जोड़ो");
  assert.equal(p.kind, "add_customer");
});
t("add customer Telugu", () => {
  const p = parseIntent("కొత్త కస్టమర్‌ను జోడించు");
  assert.equal(p.kind, "add_customer");
});

/* ---- expense ---- */
t("expense: electricity bill", () => {
  const p = parseIntent("Record an electricity bill of ₹2,300");
  assert.equal(p.kind, "record_expense");
  assert.equal(p.slots.category, "Electricity");
  assert.equal(p.slots.amount, 2300);
});
t("expense: rent", () => {
  const p = parseIntent("Paid rent 8000");
  assert.equal(p.kind, "record_expense");
  assert.equal(p.slots.category, "Rent");
});
t("expense Hindi: बिजली का खर्च", () => {
  const p = parseIntent("बिजली का खर्च ₹2300 जोड़ो");
  assert.equal(p.kind, "record_expense");
  assert.equal(p.slots.category, "Electricity");
  assert.equal(p.slots.amount, 2300);
});
t("expense Telugu: కరెంట్ బిల్లు", () => {
  const p = parseIntent("కరెంట్ బిల్లు ₹2300 జోడించు");
  assert.equal(p.kind, "record_expense");
  assert.equal(p.slots.category, "Electricity");
});

/* ---- payment vs expense disambiguation ---- */
t("'Ramesh paid 500' is payment not expense", () => {
  assert.equal(parseIntent("Ramesh paid 500").kind, "record_payment");
});
t("'paid electricity 500' is expense not payment", () => {
  assert.equal(parseIntent("paid electricity bill 500").kind, "record_expense");
});

/* ---- find / report / reminder ---- */
t("find customer", () => {
  const p = parseIntent("Search for Lakshmi");
  assert.equal(p.kind, "find_customer");
  assert.equal(p.slots.customerName, "Lakshmi");
});
t("report: profit this month", () => {
  assert.equal(parseIntent("How much profit did I make this month?").kind, "show_report");
});
t("report: who owes", () => {
  assert.equal(parseIntent("Show customers who owe more than 5000").kind, "show_report");
});
t("reminder", () => {
  assert.equal(parseIntent("Generate reminders for everyone who hasn't paid").kind, "generate_reminder");
});
t("report Hindi: मुनाफा दिखाओ", () => {
  assert.equal(parseIntent("इस महीने का मुनाफा दिखाओ").kind, "show_report");
});
t("report Telugu: లాభం చూపించు", () => {
  assert.equal(parseIntent("ఈ నెల లాభం చూపించు").kind, "show_report");
});

/* ---- unknown falls through ---- */
t("gibberish is unknown, low confidence", () => {
  const p = parseIntent("asdf qwerty zxcv");
  assert.equal(p.kind, "unknown");
  assert.equal(p.confidence, 0);
});
t("empty is unknown", () => {
  assert.equal(parseIntent("").kind, "unknown");
});

/* ---- sensitive actions always carry a confidence for confirmation ---- */
t("payment always has a confidence to gate confirmation", () => {
  const p = parseIntent("Ramesh paid 500");
  assert.ok(p.confidence > 0 && p.confidence <= 1);
});

console.log("\n" + out.join("\n"));
console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
