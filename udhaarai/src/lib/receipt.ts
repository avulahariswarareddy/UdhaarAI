import { PDFDocument, StandardFonts, rgb, type PDFImage } from "pdf-lib";

/**
 * Payment receipt generator.
 *
 * Design decisions worth stating:
 *
 * 1. The UdhaarAI mark is drawn with vectors, not embedded as a bitmap.
 *    Reading a file out of public/ at runtime is unreliable on serverless
 *    platforms, and a vector mark stays sharp at any zoom or print size.
 *
 * 2. The shop's own logo IS a bitmap, fetched from Supabase Storage. It is
 *    optional — a shop that hasn't uploaded one gets a clean typographic
 *    header instead of a broken image box.
 *
 * 3. A5 landscape. A receipt handed across a counter or sent on WhatsApp is
 *    read on a phone; A4 portrait wastes most of the screen.
 */

export type ReceiptInput = {
  receiptNo: string;
  date: Date;
  business: {
    name: string;
    address?: string | null;
    phone?: string | null;
    logo?: Uint8Array | null;
    logoMime?: string | null;
  };
  customer: { name: string; phone?: string | null };
  amount: number;
  method?: string;
  note?: string | null;
  balanceAfter: number;
};

const NAVY = rgb(0.043, 0.071, 0.125);
const BRAND = rgb(0.961, 0.62, 0.043);
const GREEN = rgb(0.133, 0.773, 0.369);
const GREY = rgb(0.45, 0.48, 0.54);
const LINE = rgb(0.88, 0.89, 0.91);

/** Rupee amounts in Indian digit grouping: 1,05,000 not 105,000. */
export function inr(n: number): string {
  const fixed = Math.round(n).toString();
  if (fixed.length <= 3) return fixed;
  const last3 = fixed.slice(-3);
  const rest = fixed.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
}

/** Amount in words — receipts are contested documents; words prevent a digit being added. */
export function amountInWords(n: number): string {
  const ones = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
    "seventeen", "eighteen", "nineteen"];
  const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

  const two = (x: number): string => {
    if (x < 20) return ones[x];
    return tens[Math.floor(x / 10)] + (x % 10 ? "-" + ones[x % 10] : "");
  };
  const three = (x: number): string => {
    const h = Math.floor(x / 100), r = x % 100;
    return (h ? ones[h] + " hundred" + (r ? " and " : "") : "") + (r ? two(r) : "");
  };

  let x = Math.round(Math.abs(n));
  if (x === 0) return "Zero rupees only";

  const parts: string[] = [];
  const crore = Math.floor(x / 10000000); x %= 10000000;
  const lakh = Math.floor(x / 100000); x %= 100000;
  const thousand = Math.floor(x / 1000); x %= 1000;

  if (crore) parts.push(three(crore) + " crore");
  if (lakh) parts.push(three(lakh) + " lakh");
  if (thousand) parts.push(three(thousand) + " thousand");
  if (x) parts.push(three(x));

  const s = parts.join(" ").replace(/\s+/g, " ").trim();
  const unit = Math.round(Math.abs(n)) === 1 ? " rupee only" : " rupees only";
  return s.charAt(0).toUpperCase() + s.slice(1) + unit;
}

export async function buildReceiptPdf(input: ReceiptInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Receipt ${input.receiptNo}`);
  doc.setProducer("UdhaarAI");
  doc.setCreator("UdhaarAI");

  // A5 landscape
  const W = 595.28, H = 419.53;
  const page = doc.addPage([W, H]);

  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

  const M = 36;

  /* ---------------- header band ---------------- */
  page.drawRectangle({ x: 0, y: H - 96, width: W, height: 96, color: NAVY });
  page.drawRectangle({ x: 0, y: H - 100, width: W, height: 4, color: BRAND });

  // shop logo, if they have one
  let logoImg: PDFImage | null = null;
  if (input.business.logo && input.business.logo.byteLength) {
    try {
      logoImg = input.business.logoMime?.includes("png")
        ? await doc.embedPng(input.business.logo)
        : await doc.embedJpg(input.business.logo);
    } catch {
      logoImg = null; // a corrupt upload must not break the receipt
    }
  }

  let textX = M;
  if (logoImg) {
    const box = 46;
    const scale = Math.min(box / logoImg.width, box / logoImg.height);
    const w = logoImg.width * scale, h = logoImg.height * scale;
    page.drawImage(logoImg, { x: M, y: H - 48 - h / 2, width: w, height: h });
    textX = M + box + 14;
  }

  page.drawText(input.business.name.slice(0, 38), {
    x: textX, y: H - 44, size: 17, font: bold, color: rgb(1, 1, 1),
  });
  const sub = [input.business.address, input.business.phone].filter(Boolean).join("  ·  ");
  if (sub) {
    page.drawText(sub.slice(0, 62), { x: textX, y: H - 62, size: 8.5, font: reg, color: rgb(0.68, 0.72, 0.78) });
  }

  // RECEIPT label, right aligned
  const label = "PAYMENT RECEIPT";
  page.drawText(label, {
    x: W - M - bold.widthOfTextAtSize(label, 10), y: H - 40, size: 10, font: bold, color: BRAND,
  });
  const noTxt = `No. ${input.receiptNo}`;
  page.drawText(noTxt, {
    x: W - M - reg.widthOfTextAtSize(noTxt, 9), y: H - 55, size: 9, font: reg, color: rgb(0.68, 0.72, 0.78),
  });
  const dateTxt = input.date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  page.drawText(dateTxt, {
    x: W - M - reg.widthOfTextAtSize(dateTxt, 9), y: H - 69, size: 9, font: reg, color: rgb(0.68, 0.72, 0.78),
  });

  /* ---------------- received from ---------------- */
  let y = H - 132;
  page.drawText("RECEIVED FROM", { x: M, y, size: 8, font: bold, color: GREY });
  y -= 19;
  page.drawText(input.customer.name.slice(0, 40), { x: M, y, size: 15, font: bold, color: NAVY });
  if (input.customer.phone) {
    y -= 15;
    page.drawText(input.customer.phone, { x: M, y, size: 9.5, font: reg, color: GREY });
  }

  /* ---------------- amount block ---------------- */
  const boxY = 128, boxH = 86;
  page.drawRectangle({
    x: M, y: boxY, width: W - M * 2, height: boxH,
    color: rgb(0.965, 0.98, 0.969), borderColor: GREEN, borderWidth: 1.2,
  });

  page.drawText("AMOUNT RECEIVED", { x: M + 18, y: boxY + boxH - 22, size: 8, font: bold, color: GREY });

  const amt = `Rs ${inr(input.amount)}`;
  page.drawText(amt, { x: M + 18, y: boxY + boxH - 52, size: 27, font: bold, color: GREEN });

  page.drawText(amountInWords(input.amount), {
    x: M + 18, y: boxY + 16, size: 9, font: italic, color: rgb(0.25, 0.4, 0.3),
  });

  // balance after, right side of the box
  const balLabel = "BALANCE AFTER THIS PAYMENT";
  page.drawText(balLabel, {
    x: W - M - 18 - bold.widthOfTextAtSize(balLabel, 8),
    y: boxY + boxH - 22, size: 8, font: bold, color: GREY,
  });
  const bal = `Rs ${inr(input.balanceAfter)}`;
  const balColor = input.balanceAfter > 0 ? BRAND : GREEN;
  page.drawText(bal, {
    x: W - M - 18 - bold.widthOfTextAtSize(bal, 18),
    y: boxY + boxH - 50, size: 18, font: bold, color: balColor,
  });
  const balNote = input.balanceAfter > 0 ? "still outstanding" : "fully settled";
  page.drawText(balNote, {
    x: W - M - 18 - reg.widthOfTextAtSize(balNote, 8.5),
    y: boxY + boxH - 64, size: 8.5, font: reg, color: GREY,
  });

  /* ---------------- meta row ---------------- */
  y = boxY - 22;
  const meta = [
    ["Mode", input.method ?? "Cash"],
    ["Note", (input.note ?? "Payment received").slice(0, 44)],
  ];
  let mx = M;
  meta.forEach(([k, v]) => {
    page.drawText(k.toUpperCase(), { x: mx, y, size: 7.5, font: bold, color: GREY });
    page.drawText(v, { x: mx, y: y - 13, size: 10, font: reg, color: NAVY });
    mx += 200;
  });

  /* ---------------- footer ---------------- */
  page.drawLine({ start: { x: M, y: 62 }, end: { x: W - M, y: 62 }, thickness: 0.8, color: LINE });

  page.drawText("Computer generated receipt. No signature required.", {
    x: M, y: 46, size: 7.5, font: reg, color: GREY,
  });
  page.drawText("Keep this for your records.", { x: M, y: 35, size: 7.5, font: reg, color: GREY });

  /* --- UdhaarAI mark, drawn rather than embedded --- */
  const markX = W - M - 104, markY = 32;
  page.drawRectangle({ x: markX, y: markY, width: 22, height: 22, color: BRAND, opacity: 0.16 });
  page.drawText("Rs", { x: markX + 4.5, y: markY + 7, size: 10, font: bold, color: BRAND });
  page.drawText("Udhaar", { x: markX + 28, y: markY + 12, size: 10.5, font: bold, color: NAVY });
  page.drawText("AI", {
    x: markX + 28 + bold.widthOfTextAtSize("Udhaar", 10.5), y: markY + 12, size: 10.5, font: bold, color: BRAND,
  });
  page.drawText("Snap. Understand. Collect.", {
    x: markX + 28, y: markY + 2, size: 6, font: reg, color: GREY,
  });

  return doc.save();
}
