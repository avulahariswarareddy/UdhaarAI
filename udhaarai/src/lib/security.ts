import { NextResponse } from "next/server";

/**
 * CSRF defence for cookie-authenticated mutating routes.
 *
 * Supabase's session lives in a cookie, so any origin that can make the
 * browser issue a POST gets the session attached automatically. SameSite=Lax
 * blocks the classic form-post case, but an Origin check is the explicit,
 * verifiable control — and it costs nothing.
 */
export function checkOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  // Same-origin fetches from some clients omit Origin entirely.
  if (!origin) return null;

  try {
    const o = new URL(origin);
    const allowed = new Set<string>([host ?? ""]);
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      allowed.add(new URL(process.env.NEXT_PUBLIC_SITE_URL).host);
    }
    if (process.env.VERCEL_URL) allowed.add(process.env.VERCEL_URL);

    if (!allowed.has(o.host)) {
      return NextResponse.json({ error: "Request rejected." }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Request rejected." }, { status: 403 });
  }
  return null;
}

/**
 * Verify a file really is the image type it claims.
 *
 * `file.type` comes from the browser and is trivially forged. Checking the
 * magic bytes is what stops a renamed script or a polyglot file being stored
 * in the bucket and later served to someone.
 */
const SIGNATURES: { mime: string; test: (b: Uint8Array) => boolean }[] = [
  { mime: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: "image/png",
    test: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    mime: "image/webp",
    test: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
  {
    mime: "image/heic",
    test: (b) =>
      b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70,
  },
];

export function sniffImageType(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  for (const s of SIGNATURES) if (s.test(bytes)) return s.mime;
  return null;
}

/** Generic client error + correlation id. Detail never leaves the server. */
export function fail(message: string, status: number, detail?: unknown) {
  const ref = crypto.randomUUID().slice(0, 8);
  if (detail) console.error(`[${ref}]`, detail);
  return NextResponse.json({ error: message, ref }, { status });
}
