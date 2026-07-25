/**
 * Client-side image preprocessing. Runs on a canvas in the browser before
 * anything is uploaded. No model, no server round trip.
 *
 * Three wins at once:
 *   1. Handwriting reads better after contrast normalisation, so fewer
 *      fields come back flagged and the admin does less work.
 *   2. A 12 MP phone photo becomes ~400 KB, so uploads work on a shop's
 *      2G-at-the-back-of-the-store connection.
 *   3. Gemini's free tier is billed per request but limited by payload;
 *      smaller images mean faster, more reliable calls.
 *
 * Every operation here is a classical image processing algorithm. They are
 * deterministic, they run in about 200ms, and they work offline.
 */

export type PreprocessResult = {
  blob: Blob;
  dataUrl: string;
  hash: string;
  width: number;
  height: number;
  originalBytes: number;
  processedBytes: number;
  stats: { meanBefore: number; meanAfter: number; contrastGain: number };
};

const MAX_EDGE = 2000; // beyond this adds no legibility, only bytes

/* ------------------------------------------------------------------ */

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That file isn't a readable image.")); };
    img.src = url;
  });
}

/**
 * Percentile-based contrast stretch. Uses the 2nd and 98th percentile
 * rather than min/max so a single dark speck or a glare highlight cannot
 * flatten the whole page — which is exactly what naive normalisation does
 * to a photo taken under a tube light.
 */
function contrastStretch(data: Uint8ClampedArray): { gain: number } {
  const hist = new Array(256).fill(0);
  const total = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const l = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) | 0;
    hist[l]++;
  }

  const lowCut = total * 0.02;
  const highCut = total * 0.98;
  let cum = 0, lo = 0, hi = 255;

  for (let i = 0; i < 256; i++) { cum += hist[i]; if (cum >= lowCut) { lo = i; break; } }
  cum = 0;
  for (let i = 0; i < 256; i++) { cum += hist[i]; if (cum >= highCut) { hi = i; break; } }

  const range = Math.max(1, hi - lo);
  const gain = 255 / range;

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      data[i + c] = Math.min(255, Math.max(0, (data[i + c] - lo) * gain));
    }
  }
  return { gain };
}

/**
 * Illumination correction by background subtraction.
 *
 * A photo of a notebook almost always has a lighting gradient — brighter
 * near the window, shadowed near the spine. Global thresholding destroys
 * the shadowed side. Estimating the background with a large box blur and
 * dividing it out flattens the page first.
 */
function flattenIllumination(data: Uint8ClampedArray, w: number, h: number) {
  const radius = Math.max(8, Math.floor(Math.min(w, h) / 20));

  // Integral image for O(1) box sums — a naive blur at this radius would
  // take seconds on a phone.
  const grey = new Float32Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    grey[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  const integral = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += grey[y * w + x];
      integral[(y + 1) * (w + 1) + (x + 1)] = integral[y * (w + 1) + (x + 1)] + rowSum;
    }
  }

  const boxMean = (x: number, y: number) => {
    const x0 = Math.max(0, x - radius), y0 = Math.max(0, y - radius);
    const x1 = Math.min(w, x + radius + 1), y1 = Math.min(h, y + radius + 1);
    const area = (x1 - x0) * (y1 - y0);
    const s =
      integral[y1 * (w + 1) + x1] - integral[y0 * (w + 1) + x1] -
      integral[y1 * (w + 1) + x0] + integral[y0 * (w + 1) + x0];
    return s / area;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const bg = boxMean(x, y);
      if (bg < 1) continue;
      const p = (y * w + x) * 4;
      // Divide by local background, rescale to a paper-white target
      const factor = 200 / bg;
      for (let c = 0; c < 3; c++) {
        data[p + c] = Math.min(255, data[p + c] * factor);
      }
    }
  }
}

/**
 * Unsharp mask. Sharpens pen strokes without amplifying paper grain the
 * way a plain 3x3 sharpen kernel does.
 */
function unsharpMask(data: Uint8ClampedArray, w: number, h: number, amount = 0.6) {
  const copy = new Uint8ClampedArray(data);
  const k = [1, 2, 1, 2, 4, 2, 1, 2, 1];
  const kSum = 16;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        let blur = 0, i = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            blur += copy[((y + dy) * w + (x + dx)) * 4 + c] * k[i++];
          }
        }
        blur /= kSum;
        data[p + c] = Math.min(255, Math.max(0, copy[p + c] + amount * (copy[p + c] - blur)));
      }
    }
  }
}

function meanLuminance(data: Uint8ClampedArray): number {
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return sum / (data.length / 4);
}

/* ------------------------------------------------------------------ */

export async function preprocessNotebookPage(file: File): Promise<PreprocessResult> {
  const img = await loadImage(file);

  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Your browser blocked image processing.");

  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const meanBefore = meanLuminance(imageData.data);

  flattenIllumination(imageData.data, w, h);
  const { gain } = contrastStretch(imageData.data);
  unsharpMask(imageData.data, w, h);

  const meanAfter = meanLuminance(imageData.data);
  ctx.putImageData(imageData, 0, 0);

  const { averageHash } = await import("@/lib/verify/phash");
  const hash = averageHash(canvas);

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not encode the processed image."))),
      "image/jpeg",
      0.88
    )
  );

  return {
    blob,
    dataUrl: canvas.toDataURL("image/jpeg", 0.7),
    hash,
    width: w,
    height: h,
    originalBytes: file.size,
    processedBytes: blob.size,
    stats: {
      meanBefore: Math.round(meanBefore),
      meanAfter: Math.round(meanAfter),
      contrastGain: Math.round(gain * 100) / 100,
    },
  };
}

/**
 * Blur detection via variance of the Laplacian. Classical, fast, reliable.
 * Lets the app say "that photo is too blurry, retake it" BEFORE spending a
 * Gemini call and thirty seconds of the shopkeeper's time.
 */
export function estimateSharpness(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 1000;

  const w = Math.min(canvas.width, 800);
  const h = Math.round((w / canvas.width) * canvas.height);

  const small = document.createElement("canvas");
  small.width = w; small.height = h;
  const sctx = small.getContext("2d", { willReadFrequently: true });
  if (!sctx) return 1000;
  sctx.drawImage(canvas, 0, 0, w, h);

  const { data } = sctx.getImageData(0, 0, w, h);
  const grey = new Float32Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    grey[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  const lap: number[] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      lap.push(
        -4 * grey[p] + grey[p - 1] + grey[p + 1] + grey[p - w] + grey[p + w]
      );
    }
  }

  const mean = lap.reduce((s, v) => s + v, 0) / lap.length;
  return lap.reduce((s, v) => s + (v - mean) ** 2, 0) / lap.length;
}

export const BLUR_THRESHOLD = 55;
