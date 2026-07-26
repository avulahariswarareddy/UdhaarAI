import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { fail } from "@/lib/security";

export const runtime = "nodejs";

/**
 * Deployment diagnostic: which Gemini key is this deployment actually
 * running with? Exists because "I swapped the key in Vercel but nothing
 * changed" is undiagnosable from outside — env vars only reach functions
 * through a fresh deployment, and a save to the wrong environment (or a
 * redeploy that predates the save) fails silently. Requires a signed-in
 * session and reveals only a masked fingerprint, never the key.
 */
export async function GET() {
  const user = await getUser();
  if (!user) return fail("Sign in first.", 401);

  const key = process.env.GEMINI_API_KEY ?? "";
  return NextResponse.json({
    configured: key.length > 0,
    length: key.length,
    fingerprint: key.length >= 8 ? `${key.slice(0, 4)}…${key.slice(-4)}` : "(too short)",
    deployedAt: process.env.VERCEL_DEPLOYMENT_ID ?? null,
  });
}
