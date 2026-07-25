import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { checkOrigin } from "@/lib/security";

export const runtime = "nodejs";

/**
 * Sign-in code requests, rate limited.
 *
 * The browser used to call Supabase directly, which meant the only limit was
 * whatever Supabase's project defaults happen to be. Two problems with that:
 * an attacker can burn someone's inbox with sign-in codes (mail-bombing), and
 * unlimited requests against a known address are the first half of a brute
 * force. Routing through the server puts a limit we control in front of it.
 *
 * Two independent buckets, because either one alone is bypassable:
 *   - per IP      stops one machine spraying many addresses
 *   - per address stops many machines targeting one inbox
 */
const Body = z.object({ email: z.string().email().max(254) });

const PER_IP = { limit: 5, window: 15 * 60_000 };
const PER_EMAIL = { limit: 3, window: 15 * 60_000 };

export async function POST(request: Request) {
  const csrf = checkOrigin(request);
  if (csrf) return csrf;

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That email address doesn't look right." }, { status: 400 });
  }
  const email = parsed.data.email.trim().toLowerCase();

  const byIp = rateLimit(clientKey(request, "otp-ip"), PER_IP.limit, PER_IP.window);
  const byEmail = rateLimit(`otp-email:${email}`, PER_EMAIL.limit, PER_EMAIL.window);
  const blocked = !byIp.ok ? byIp : !byEmail.ok ? byEmail : null;

  if (blocked) {
    const mins = Math.ceil(blocked.retryAfter / 60);
    return NextResponse.json(
      { error: `Too many sign-in codes requested. Try again in ${mins} minute${mins === 1 ? "" : "s"}.` },
      { status: 429, headers: { "Retry-After": String(blocked.retryAfter) } }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });

  if (error) {
    console.error("[otp]", error.message);
    // Deliberately generic: telling the caller whether an address exists,
    // or exactly why Supabase refused, is free reconnaissance.
    return NextResponse.json(
      { error: "Could not send a code right now. Try again shortly." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, remaining: Math.min(byIp.remaining, byEmail.remaining) });
}
