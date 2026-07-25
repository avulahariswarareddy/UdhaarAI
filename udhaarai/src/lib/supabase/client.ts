"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * Browser client. Uses the anon key, which is safe to ship ONLY because
 * every table has Row Level Security enabled (see supabase/schema.sql).
 */
export function createClient() {
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
