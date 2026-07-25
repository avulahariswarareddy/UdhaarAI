/**
 * Perceptual hash (average hash, 8x8). Runs in the browser on a canvas.
 *
 * Purpose: catch a page being uploaded twice. Without this, a shopkeeper
 * who taps upload twice on a slow connection doubles every debt on that
 * page, and the ledger is quietly wrong.
 *
 * A cryptographic hash would not work — re-photographing the same page
 * gives different bytes. A perceptual hash survives that.
 */

export function averageHash(canvas: HTMLCanvasElement): string {
  const size = 8;
  const small = document.createElement("canvas");
  small.width = size;
  small.height = size;

  const ctx = small.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(canvas, 0, 0, size, size);

  const { data } = ctx.getImageData(0, 0, size, size);
  const grey: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    grey.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }

  const mean = grey.reduce((s, v) => s + v, 0) / grey.length;

  let bits = "";
  for (const g of grey) bits += g >= mean ? "1" : "0";

  // 64 bits -> 16 hex chars
  let hex = "";
  for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}

/** Number of differing bits. Under 6 out of 64 means "the same page". */
export function hammingDistance(a: string, b: string): number {
  if (!a || !b || a.length !== b.length) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) { d += x & 1; x >>= 1; }
  }
  return d;
}

export const DUPLICATE_THRESHOLD = 6;
