/**
 * Receipts are contested documents — a customer quotes the number back in a
 * dispute. Numbers and words must be right every time.
 */
import assert from "node:assert/strict";
import { inr, amountInWords, buildReceiptPdf } from "../src/lib/receipt";

let passed = 0, failed = 0;
const out: string[] = [];
function t(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => { passed++; out.push(`  PASS  ${name}`); })
    .catch((e) => { failed++; out.push(`  FAIL  ${name}\n        ${(e as Error).message.split("\n")[0]}`); });
}

(async () => {
  /* Indian digit grouping */
  await t("inr: hundreds unchanged", () => assert.equal(inr(450), "450"));
  await t("inr: thousands", () => assert.equal(inr(1250), "1,250"));
  await t("inr: lakh grouping not western", () => assert.equal(inr(105000), "1,05,000"));
  await t("inr: crore grouping", () => assert.equal(inr(12345678), "1,23,45,678"));
  await t("inr: zero", () => assert.equal(inr(0), "0"));
  await t("inr: rounds paise", () => assert.equal(inr(1250.6), "1,251"));

  /* Words */
  await t("words: singular rupee", () => assert.equal(amountInWords(1), "One rupee only"));
  await t("words: plural rupees", () => assert.ok(amountInWords(2).endsWith("rupees only")));
  await t("words: zero capitalised", () => assert.equal(amountInWords(0), "Zero rupees only"));
  await t("words: teens", () => assert.equal(amountInWords(15), "Fifteen rupees only"));
  await t("words: hundreds with and", () => assert.equal(amountInWords(450), "Four hundred and fifty rupees only"));
  await t("words: thousands", () => assert.equal(amountInWords(1450), "One thousand four hundred and fifty rupees only"));
  await t("words: lakh", () => assert.equal(amountInWords(105000), "One lakh five thousand rupees only"));
  await t("words: crore", () => assert.ok(amountInWords(12345678).startsWith("One crore")));
  await t("words: always capitalised", () => {
    [1, 7, 99, 450, 10000, 250000].forEach((n) => {
      const w = amountInWords(n);
      assert.equal(w[0], w[0].toUpperCase(), `${n} -> ${w}`);
    });
  });
  await t("words: never empty", () => {
    [0, 1, 10, 100, 1000, 100000, 10000000].forEach((n) => assert.ok(amountInWords(n).length > 5));
  });

  /* PDF */
  const base = {
    receiptNo: "VT-2026-0001",
    date: new Date("2026-07-24T10:00:00Z"),
    business: { name: "Vedasri Traders", address: "Gachibowli", phone: "9876543210" },
    customer: { name: "Ramesh Yadav", phone: "9876543210" },
    amount: 1450,
    balanceAfter: 7750,
  };

  await t("pdf: produces a valid PDF file", async () => {
    const b = await buildReceiptPdf(base);
    assert.ok(b.byteLength > 800, "suspiciously small");
    assert.equal(Buffer.from(b.slice(0, 5)).toString(), "%PDF-");
  });

  await t("pdf: works with no shop logo", async () => {
    const b = await buildReceiptPdf({ ...base, business: { ...base.business, logo: null } });
    assert.ok(b.byteLength > 800);
  });

  await t("pdf: a corrupt logo does not break the receipt", async () => {
    const junk = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const b = await buildReceiptPdf({
      ...base,
      business: { ...base.business, logo: junk, logoMime: "image/png" },
    });
    assert.ok(b.byteLength > 800, "should still issue a receipt");
  });

  await t("pdf: settled balance still renders", async () => {
    const b = await buildReceiptPdf({ ...base, balanceAfter: 0 });
    assert.ok(b.byteLength > 800);
  });

  await t("pdf: very long names do not throw", async () => {
    const b = await buildReceiptPdf({
      ...base,
      business: { ...base.business, name: "A".repeat(120), address: "B".repeat(200) },
      customer: { name: "C".repeat(120), phone: "9876543210" },
    });
    assert.ok(b.byteLength > 800);
  });

  await t("pdf: large amount renders", async () => {
    const b = await buildReceiptPdf({ ...base, amount: 9999999, balanceAfter: 12345678 });
    assert.ok(b.byteLength > 800);
  });

  console.log("\n" + out.join("\n"));
  console.log(`\n  ${passed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
})();
