/**
 * In-memory sliding-window limiter. Good enough for a single-admin app on
 * one Vercel region; swap for Upstash Redis when you add staff accounts.
 */
type Hit = { count: number; resetAt: number };
const buckets = new Map<string, Hit>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const hit = buckets.get(key);

  if (!hit || now > hit.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }
  if (hit.count >= limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((hit.resetAt - now) / 1000) };
  }
  hit.count += 1;
  return { ok: true, remaining: limit - hit.count, retryAfter: 0 };
}

export function clientKey(req: Request, tag: string) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  return `${tag}:${ip}`;
}
