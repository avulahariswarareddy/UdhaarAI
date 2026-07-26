import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { checkOrigin, fail } from "@/lib/security";

export const runtime = "nodejs";

const Body = z.object({
  sourceId: z.string().uuid(),
  targetId: z.string().uuid(),
});

/**
 * Merge a duplicate customer into another: every transaction and reminder
 * moves to the target, then the source record is deleted. Reassignment runs
 * before the delete so a mid-way failure never loses a transaction — worst
 * case is a duplicate customer with no history left under it, not lost data.
 */
export async function POST(request: Request) {
  const csrf = checkOrigin(request);
  if (csrf) return csrf;
  const user = await getUser();
  if (!user) return fail("Sign in first.", 401);

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.sourceId === parsed.data.targetId) {
    return fail("Pick two different customers to merge.", 400);
  }
  const { sourceId, targetId } = parsed.data;

  const supabase = await createClient();
  const { data: pair } = await supabase
    .from("customers").select("id").eq("owner_id", user.id).in("id", [sourceId, targetId]);
  if ((pair ?? []).length !== 2) return fail("Both customers must exist in your ledger.", 404);

  const { error: txError } = await supabase
    .from("transactions").update({ customer_id: targetId }).eq("customer_id", sourceId).eq("owner_id", user.id);
  if (txError) return fail("Could not move that customer's transactions.", 500, txError);

  const { error: remError } = await supabase
    .from("reminders").update({ customer_id: targetId }).eq("customer_id", sourceId).eq("owner_id", user.id);
  if (remError) return fail("Transactions moved, but reminders could not be — try again.", 500, remError);

  const { error: delError } = await supabase
    .from("customers").delete().eq("id", sourceId).eq("owner_id", user.id);
  if (delError) return fail("Merged the history, but couldn't remove the duplicate — try deleting it separately.", 500, delError);

  return NextResponse.json({ ok: true, targetId });
}
