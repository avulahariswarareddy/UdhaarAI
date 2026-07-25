import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { checkOrigin } from "@/lib/security";

export const runtime = "nodejs";

/**
 * Code verification, rate limited.
 *
 * A six-digit code is a million possibilities, which sounds like a lot until
 * you can try it a thousand times a second. Ten attempts per fifteen minutes
 * per address makes guessing hopeless while staying invisible to anyone
 * typing their own code correctly, or fumbling it once or twice.
 */
const Body = z.object({
  email: z.string().email().max(254),
  token: z.string().regex(/^\d{6}$/),
});

export async function POST(request: Request) {
  const csrf = checkOrigin(request);
  if (csrf) return csrf;

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the six-digit code." }, { status: 400 });
  }
  const email = parsed.data.email.trim().toLowerCase();

  const byIp = rateLimit(clientKey(request, "verify-ip"), 20, 15 * 60_000);
  const byEmail = rateLimit(`verify-email:${email}`, 10, 15 * 60_000);
  const blocked = !byIp.ok ? byIp : !byEmail.ok ? byEmail : null;

  if (blocked) {
    const mins = Math.ceil(blocked.retryAfter / 60);
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.` },
      { status: 429, headers: { "Retry-After": String(blocked.retryAfter) } }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: parsed.data.token,
    type: "email",
  });

  if (error) {
    return NextResponse.json(
      { error: "That code didn't work. Request a new one." },
      { status: 401 }
    );
  }

  return NextResponse.json({ ok: true });
}
