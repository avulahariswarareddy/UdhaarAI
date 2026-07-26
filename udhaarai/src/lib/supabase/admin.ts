import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Service-role client. Bypasses Row Level Security entirely — every call
 * site is responsible for scoping its own queries correctly (owner_id
 * filters, explicit ids). Never import this into anything that runs in the
 * browser; it isn't marked "use client" because nothing here does, but the
 * key itself must never leave the server process.
 *
 * Used by the judge auto-login route (creating/seeding the shared judge
 * account) and by routes that must write to server-only tables — the
 * audit_logs policy deliberately blocks inserts from user sessions, so
 * audit rows are written through this client.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || key.trim() === "") {
    throw new Error("Missing environment variable SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createSupabaseClient(env.supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
