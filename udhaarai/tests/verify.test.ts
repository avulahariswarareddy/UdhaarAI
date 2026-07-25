/**
 * Tests for the deterministic layer — the parts that must be right without
 * any model involved. Run with: npm test
 */
import assert from "node:assert/strict";
import { parseAmount, normaliseDigits, hasIndicDigits } from "../src/lib/verify/numerals";
import { canonical, phoneticKey, jaroWinkler, findMatches, AUTO_MERGE, ASK_ADMIN } from "../src/lib/verify/names";
import { checkPhone, toWhatsApp } from "../src/lib/verify/phone";
import { checkDate } from "../src/lib/verify/dates";

let passed = 0;
let failed = 0;
const results: string[] = [];

function t(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    results.push(`  PASS  ${name}`);
  } catch (e) {
    failed++;
    results.push(`  FAIL  ${name}\n        ${(e as Error).message.split("\n")[0]}`);
  }
}

/* ---------------- numerals ---------------- */
t("Devanagari digits convert", () => {
  assert.equal(normaliseDigits("\u0968\u096B\u0966"), "250");
});
t("Telugu digits convert", () => {
  assert.equal(normaliseDigits("\u0C67\u0C66\u0C66"), "100");
});
t("mixed script digits convert", () => {
  assert.equal(normaliseDigits("Rs \u0968\u096B\u0966/-"), "Rs 250/-");
});
t("hasIndicDigits detects and rejects correctly", () => {
  assert.equal(hasIndicDigits("\u0968\u096B"), true);
  assert.equal(hasIndicDigits("250"), false);
});
t("amount: comma format", () => assert.equal(parseAmount("1,250"), 1250));
t("amount: trailing /-", () => assert.equal(parseAmount("450/-"), 450));
t("amount: Rs prefix", () => assert.equal(parseAmount("Rs 450"), 450));
t("amount: rupee sign", () => assert.equal(parseAmount("\u20B9 1,05,000"), 105000));
t("amount: k shorthand", () => assert.equal(parseAmount("1.5k"), 1500));
t("amount: Devanagari", () => assert.equal(parseAmount("\u0968\u096B\u0966"), 250));
t("amount: empty is null not zero", () => assert.equal(parseAmount(""), null));
t("amount: pure text is null", () => assert.equal(parseAmount("paid"), null));
t("amount: negative rejected", () => assert.equal(parseAmount(-50), null));
t("amount: decimal kept", () => assert.equal(parseAmount("450.50"), 450.5));
t("amount: double-dot noise stripped", () => assert.equal(parseAmount("12.50.00"), 125000));

/* ---------------- names ---------------- */
t("canonical strips honorific and case", () => {
  assert.equal(canonical("Shri Ramesh Yadav"), "ramesh yadav");
});
t("canonical strips punctuation", () => {
  assert.equal(canonical("Ramesh  Yadav."), "ramesh yadav");
});
t("phonetic: Yadav == Yadhav", () => {
  assert.equal(phoneticKey("Ramesh Yadav"), phoneticKey("Ramesh Yadhav"));
});
t("phonetic: Vinod == Winod", () => {
  assert.equal(phoneticKey("Vinod"), phoneticKey("Winod"));
});
t("phonetic: Suresh == Suresh with sh collapse", () => {
  assert.equal(phoneticKey("Sureshh"), phoneticKey("Suresh"));
});
t("phonetic: different people stay different", () => {
  assert.notEqual(phoneticKey("Ramesh"), phoneticKey("Mahesh"));
});
t("jaroWinkler identical is 1", () => assert.equal(jaroWinkler("ramesh", "ramesh"), 1));
t("jaroWinkler close names score high", () => {
  assert.ok(jaroWinkler("ramesh", "rameshh") > 0.9);
});
t("jaroWinkler unrelated names score low", () => {
  assert.ok(jaroWinkler("ramesh", "kavita") < 0.6);
});

const roster = [
  { id: "a", name: "Ramesh Yadav" },
  { id: "b", name: "Kavita Sharma" },
  { id: "c", name: "Suresh Reddy" },
];
t("match: exact hits auto-merge band", () => {
  const m = findMatches("Ramesh Yadav", roster);
  assert.equal(m[0].id, "a");
  assert.ok(m[0].score >= AUTO_MERGE);
});
t("match: spelling variant is caught", () => {
  const m = findMatches("Ramesh Yadhav", roster);
  assert.equal(m[0].id, "a");
  assert.ok(m[0].score >= ASK_ADMIN, `scored ${m[0]?.score}`);
});
t("match: reordered tokens are caught", () => {
  const m = findMatches("Yadav Ramesh", roster);
  assert.equal(m[0].id, "a");
});
t("match: honorific variant is caught", () => {
  const m = findMatches("Shri Ramesh Yadav", roster);
  assert.equal(m[0].id, "a");
});
t("match: genuine new customer returns nothing strong", () => {
  const m = findMatches("Anjali Gupta", roster);
  assert.ok(!m.length || m[0].score < ASK_ADMIN, `wrongly matched ${m[0]?.name}`);
});
t("match: similar-but-different is NOT auto-merged", () => {
  const m = findMatches("Suresh Yadav", roster);
  if (m.length) assert.ok(m[0].score < AUTO_MERGE, `auto-merged ${m[0].name} at ${m[0].score}`);
});

/* ---------------- phone ---------------- */
t("phone: plain 10 digit valid", () => assert.equal(checkPhone("9876543210").valid, true));
t("phone: +91 stripped", () => assert.equal(checkPhone("+91 98765 43210").normalised, "9876543210"));
t("phone: leading 0 stripped", () => assert.equal(checkPhone("09876543210").normalised, "9876543210"));
t("phone: 9 digits invalid", () => assert.equal(checkPhone("987654321").valid, false));
t("phone: starting with 5 invalid", () => assert.equal(checkPhone("5876543210").valid, false));
t("phone: all same digit invalid", () => assert.equal(checkPhone("9999999999").valid, false));
t("phone: empty is valid absence", () => assert.equal(checkPhone("").valid, true));
t("phone: Devanagari digits parse", () => {
  assert.equal(checkPhone("\u096F\u096E\u096D\u096C\u096B\u096A\u0969\u0968\u0967\u0966").normalised, "9876543210");
});
t("whatsapp link format", () => assert.equal(toWhatsApp("9876543210"), "919876543210"));

/* ---------------- dates ---------------- */
t("date: dd/mm/yy parses day-first", () => {
  assert.equal(checkDate("12/03/24").iso, "2024-03-12");
});
t("date: dd-mm-yyyy parses", () => {
  assert.equal(checkDate("12-03-2024").iso, "2024-03-12");
});
t("date: swapped values corrected", () => {
  assert.equal(checkDate("03/25/24").iso, "2024-03-25");
});
t("date: named month parses", () => {
  assert.equal(checkDate("12 Mar 24").iso, "2024-03-12");
});
t("date: 31 Feb rejected", () => assert.equal(checkDate("31/02/24").valid, false));
t("date: month 13 rejected when unswappable", () => {
  assert.equal(checkDate("13/13/24").valid, false);
});
t("date: garbage rejected, not guessed", () => {
  assert.equal(checkDate("xyz").valid, false);
});
t("date: empty is valid absence", () => assert.equal(checkDate("").valid, true));
t("date: absurd year rejected", () => assert.equal(checkDate("12/03/1899").valid, false));
t("date: Devanagari digits parse", () => {
  assert.equal(checkDate("\u0967\u0968/\u0966\u0969/\u0968\u096A").iso, "2024-03-12");
});

console.log("\n" + results.join("\n"));
console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
