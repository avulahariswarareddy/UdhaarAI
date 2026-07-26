import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env, judgeEnv } from "@/lib/env";

/**
 * Service-role client. Bypasses Row Level Security entirely — every call
 * site is responsible for scoping its own queries correctly (owner_id
 * filters, explicit ids). Never import this into anything that runs in the
 * browser; it isn't marked "use client" because nothing here does, but the
 * key itself must never leave the server process.
 *
 * Used only by the judge auto-login route: creating/looking up the shared
 * judge account and seeding its workspace, both of which need to act
 * outside any one user's session.
 */
export function createAdminClient() {
  const { serviceRoleKey } = judgeEnv();
  return createSupabaseClient(env.supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
