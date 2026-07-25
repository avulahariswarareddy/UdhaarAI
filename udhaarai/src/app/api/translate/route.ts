import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { translateLine } from "@/lib/gemini";
import { checkOrigin, fail } from "@/lib/security";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  text: z.string().min(1).max(400),
  target: z.enum(["hi", "te"]),
});

/** Translate a single assistant line on demand. */
export async function POST(request: Request) {
  const csrf = checkOrigin(request);
  if (csrf) return csrf;

  const limit = rateLimit(clientKey(request, "translate"), 30, 60_000);
  if (!limit.ok) return fail("Slow down a moment.", 429);

  const user = await getUser();
  if (!user) return fail("Sign in first.", 401);

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Nothing to translate.", 400);

  try {
    const translated = await translateLine(parsed.data.text, parsed.data.target);
    return NextResponse.json({ text: translated });
  } catch (e) {
    return fail("Could not translate that right now.", 502, e);
  }
}
