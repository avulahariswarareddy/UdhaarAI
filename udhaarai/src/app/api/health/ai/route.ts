import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getUser } from "@/lib/supabase/server";
import { fail } from "@/lib/security";

export const runtime = "nodejs";

/**
 * Deployment diagnostic: which Gemini key is this deployment actually
 * running with, and does Google accept it? Exists because "I swapped the
 * key in Vercel but nothing changed" is undiagnosable from outside — env
 * vars only reach functions through a fresh deployment, and a save to the
 * wrong environment (or a redeploy that predates the save) fails silently.
 * Requires a signed-in session; reveals only a masked fingerprint and,
 * with ?probe=1, the first lines of Google's raw verdict on one tiny
 * request — never the key itself.
 */
export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return fail("Sign in first.", 401);

  const key = process.env.GEMINI_API_KEY ?? "";
  const base = {
    configured: key.length > 0,
    length: key.length,
    fingerprint: key.length >= 8 ? `${key.slice(0, 4)}…${key.slice(-4)}` : "(too short)",
    deployedAt: process.env.VERCEL_DEPLOYMENT_ID ?? null,
  };

  if (new URL(request.url).searchParams.get("probe") !== "1") {
    return NextResponse.json(base);
  }

  try {
    const m = new GoogleGenerativeAI(key).getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const r = await m.generateContent({
      contents: [{ role: "user", parts: [{ text: "Say OK" }] }],
      generationConfig: { maxOutputTokens: 5 },
    });
    return NextResponse.json({ ...base, probeOk: true, sample: r.response.text().slice(0, 20) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ...base, probeOk: false, probeError: msg.slice(0, 400) });
  }
}
