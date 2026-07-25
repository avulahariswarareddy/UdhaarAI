/**
 * The app must USE what Gemini sends, not dump it or discard it.
 * Every case here is a real failure mode observed with LLM JSON output.
 */
import assert from "node:assert/strict";
import { salvageJson } from "../src/lib/verify/model-output";
import { toWhatsApp } from "../src/lib/verify/phone";

let passed = 0, failed = 0;
const out: string[] = [];
function t(name: string, fn: () => void) {
  try { fn(); passed++; out.push(`  PASS  ${name}`); }
  catch (e) { failed++; out.push(`  FAIL  ${name}\n        ${(e as Error).message.split("\n")[0]}`); }
}

const GOOD = '{"page_language":"Hindi","entries":[{"credit":{"value":450,"confidence":0.9}}]}';

t("bare JSON parses directly", () => {
  const r = salvageJson<{ page_language: string }>(GOOD);
  assert.ok(r.ok && r.value.page_language === "Hindi");
  assert.equal(r.ok && r.strategy, "direct");
});

t("markdown-fenced JSON is recovered", () => {
  const r = salvageJson<{ page_language: string }>("```json\n" + GOOD + "\n```");
  assert.ok(r.ok, "should salvage");
  assert.equal(r.ok && r.value.page_language, "Hindi");
});

t("fence without language tag is recovered", () => {
  const r = salvageJson<{ page_language: string }>("```\n" + GOOD + "\n```");
  assert.ok(r.ok && r.value.page_language === "Hindi");
});

t("prose before the JSON is stripped", () => {
  const r = salvageJson<{ page_language: string }>("Here is the extracted data:\n\n" + GOOD);
  assert.ok(r.ok && r.value.page_language === "Hindi");
});

t("prose after the JSON is stripped", () => {
  const r = salvageJson<{ page_language: string }>(GOOD + "\n\nLet me know if you need anything else!");
  assert.ok(r.ok && r.value.page_language === "Hindi");
});

t("prose on both sides is stripped", () => {
  const r = salvageJson<{ page_language: string }>("Sure! Here you go:\n```json\n" + GOOD + "\n```\nHope that helps.");
  assert.ok(r.ok && r.value.page_language === "Hindi");
});

t("trailing comma is repaired", () => {
  const r = salvageJson<{ a: number }>('{"a":1,}');
  assert.ok(r.ok && r.value.a === 1);
  assert.ok(r.ok && r.repaired);
});

t("smart quotes are repaired", () => {
  const r = salvageJson<{ a: string }>('{\u201Ca\u201D:\u201Cb\u201D}');
  assert.ok(r.ok && r.value.a === "b");
});

t("NaN becomes null instead of throwing", () => {
  const r = salvageJson<{ a: number | null }>('{"a": NaN}');
  assert.ok(r.ok && r.value.a === null);
});

t("braces inside string values do not confuse the extractor", () => {
  const r = salvageJson<{ items: string }>('{"items":"rice {5kg}, oil"}');
  assert.ok(r.ok && r.value.items === "rice {5kg}, oil");
});

t("escaped quotes inside strings survive", () => {
  const r = salvageJson<{ note: string }>('{"note":"said \\"paid\\" today"}');
  assert.ok(r.ok && r.value.note.includes('"paid"'));
});

t("truncated response keeps the complete rows", () => {
  const cut = '{"page_language":"Hindi","entries":[{"credit":450},{"credit":300},{"credit":';
  const r = salvageJson<{ entries: unknown[] }>(cut);
  assert.ok(r.ok, "should recover something from a truncated reply");
  assert.ok(r.ok && Array.isArray(r.value.entries) && r.value.entries.length >= 1);
});

t("pure prose with no JSON fails cleanly", () => {
  const r = salvageJson("I'm sorry, I cannot read this image.");
  assert.equal(r.ok, false);
});

t("empty string fails cleanly", () => assert.equal(salvageJson("").ok, false));
t("null input fails cleanly", () => assert.equal(salvageJson(null as never).ok, false));

t("array at top level is handled", () => {
  const r = salvageJson<number[]>("[1,2,3]");
  assert.ok(r.ok && r.value.length === 3);
});

t("nested objects survive intact", () => {
  const r = salvageJson<{ e: { c: { v: number } }[] }>('{"e":[{"c":{"v":450}}]}');
  assert.ok(r.ok && r.value.e[0].c.v === 450);
});

/* ---------------- WhatsApp links ---------------- */
t("wa: 10-digit gets 91 prefix", () => assert.equal(toWhatsApp("9876543210"), "919876543210"));
t("wa: already +91 is not double-prefixed", () => assert.equal(toWhatsApp("+919876543210"), "919876543210"));
t("wa: spaces and dashes ignored", () => assert.equal(toWhatsApp("98765-43210"), "919876543210"));
t("wa: leading zero stripped", () => assert.equal(toWhatsApp("09876543210"), "919876543210"));
t("wa: 11 digits is rejected, not mangled", () => assert.equal(toWhatsApp("98765432101"), null));
t("wa: invalid prefix rejected", () => assert.equal(toWhatsApp("5876543210"), null));
t("wa: empty rejected", () => assert.equal(toWhatsApp(""), null));
t("wa: never returns a wrong-length number", () => {
  const inputs = ["9876543210", "+919876543210", "09876543210", "919876543210", "98765 43210"];
  inputs.forEach((i) => {
    const r = toWhatsApp(i);
    if (r !== null) assert.equal(r.length, 12, `${i} produced ${r}`);
  });
});

console.log("\n" + out.join("\n"));
console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
