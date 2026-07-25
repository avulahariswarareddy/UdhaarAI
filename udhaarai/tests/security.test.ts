/**
 * Security regression tests. Each of these corresponds to a specific
 * vulnerability class found during the audit.
 */
import assert from "node:assert/strict";

let passed = 0, failed = 0;
const out: string[] = [];
function t(name: string, fn: () => void) {
  try { fn(); passed++; out.push(`  PASS  ${name}`); }
  catch (e) { failed++; out.push(`  FAIL  ${name}\n        ${(e as Error).message.split("\n")[0]}`); }
}

/* --- CSV formula injection (mirrors src/app/api/export/route.ts) --- */
function csvCell(v: unknown) {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
t("csv: equals-prefixed cell is neutralised", () => {
  assert.equal(csvCell("=1+1"), "'=1+1");
});
t("csv: DDE payload is neutralised", () => {
  assert.ok(csvCell('=cmd|\'/c calc\'!A1').startsWith("'"));
});
t("csv: plus, minus, at are neutralised", () => {
  ["+x", "-x", "@x"].forEach((s) => assert.ok(csvCell(s).startsWith("'")));
});
t("csv: normal name untouched", () => assert.equal(csvCell("Ramesh Yadav"), "Ramesh Yadav"));
t("csv: comma still quoted", () => assert.equal(csvCell("Yadav, Ramesh"), '"Yadav, Ramesh"'));
t("csv: embedded quote doubled", () => assert.equal(csvCell('say "hi"'), '"say ""hi"""'));
t("csv: CR does not break the row", () => assert.ok(csvCell("a\rb").startsWith('"')));

/* --- open redirect (mirrors LoginForm + auth/callback) --- */
function safeNext(raw: string) {
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
}
t("redirect: protocol-relative blocked", () => assert.equal(safeNext("//evil.com"), "/dashboard"));
t("redirect: absolute URL blocked", () => assert.equal(safeNext("https://evil.com"), "/dashboard"));
t("redirect: backslash trick blocked", () => assert.equal(safeNext("\\\\evil.com"), "/dashboard"));
t("redirect: legitimate path allowed", () => assert.equal(safeNext("/dashboard/customers"), "/dashboard/customers"));

/* --- image magic bytes --- */
import { sniffImageType } from "../src/lib/security";
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0]);
const html = new TextEncoder().encode("<html><script>x</script>");
t("sniff: real JPEG accepted", () => assert.ok(sniffImageType(jpeg)?.includes("jpeg")));
t("sniff: real PNG accepted", () => assert.ok(sniffImageType(png)?.includes("png")));
t("sniff: HTML disguised as image rejected", () => assert.equal(sniffImageType(html), null));
t("sniff: empty buffer rejected", () => assert.equal(sniffImageType(new Uint8Array(0)), null));

/* --- text sanitisation --- */
import { sanitizeText } from "../src/lib/utils";
t("sanitize: angle brackets stripped", () => {
  assert.ok(!sanitizeText("<script>alert(1)</script>").includes("<"));
});
t("sanitize: null byte stripped", () => {
  assert.ok(!sanitizeText("a\u0000b").includes("\u0000"));
});
t("sanitize: length capped", () => assert.ok(sanitizeText("x".repeat(999), 100).length <= 100));
t("sanitize: non-string returns empty", () => assert.equal(sanitizeText({ a: 1 }), ""));

console.log("\n" + out.join("\n"));
console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
