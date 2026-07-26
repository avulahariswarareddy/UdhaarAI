import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { judgeEnv } from "@/lib/env";
import { checkOrigin, fail } from "@/lib/security";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { seedJudgeWorkspace } from "@/lib/judge-seed";

export const runtime = "nodejs";

/**
 * One-click judge sign-in.
 *
 * This is a real Supabase sign-in — signInWithPassword against a dedicated,
 * pre-provisioned account (JUDGE_ACCOUNT_EMAIL/PASSWORD, server-only env
 * vars, never sent to the client) — not an auth bypass. The resulting
 * session is identical in every way to a normal user's: same cookies, same
 * RLS scoping, full read/write on exactly that account's own rows.
 *
 * First call ever: the account doesn't exist yet, so it's created via the
 * admin API and seeded with a rich demo workspace. Every call after that
 * just signs in — the seed never re-runs, so nothing a judge does gets
 * reset mid-competition.
 */
export async function POST(request: Request) {
  const csrf = checkOrigin(request);
  if (csrf) return csrf;

  const limit = rateLimit(clientKey(request, "judge-login"), 10, 60_000);
  if (!limit.ok) return fail("Slow down a moment.", 429);

  let email: string, password: string;
  try {
    ({ email, password } = judgeEnv());
  } catch (e) {
    return fail("Judge workspace isn't configured yet — missing environment variables.", 500, e);
  }

  const supabase = await createClient();

  const firstAttempt = await supabase.auth.signInWithPassword({ email, password });
  if (!firstAttempt.error) {
    return NextResponse.json({ ok: true, created: false });
  }

  // Sign-in failed — most likely because the account doesn't exist yet.
  // Provision it, then sign in for real.
  const admin = createAdminClient();
  const { error: createError } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });

  if (createError) {
    const alreadyExists = /already|exists|registered/i.test(createError.message);
    return fail(
      alreadyExists
        ? "The judge account already exists but the password doesn't match — check that JUDGE_ACCOUNT_PASSWORD matches what created it."
        : "Could not set up the judge workspace.",
      500, createError
    );
  }

  const secondAttempt = await supabase.auth.signInWithPassword({ email, password });
  if (secondAttempt.error) {
    return fail("Judge account created, but the sign-in that should follow failed.", 500, secondAttempt.error);
  }

  const userId = secondAttempt.data.user?.id;
  if (userId) {
    try {
      await seedJudgeWorkspace(admin, userId);
    } catch (e) {
      // The judge is already signed in at this point — a partially-seeded
      // workspace is a far better failure mode than blocking sign-in on it.
      console.error("[judge-seed]", e);
    }
  }

  return NextResponse.json({ ok: true, created: true });
}
