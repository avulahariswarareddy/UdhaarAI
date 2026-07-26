/**
 * Fail loudly at boot instead of quietly at 2am.
 * Anything read here is validated once and reused.
 */
function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`
    );
  }
  return value;
}

export const env = {
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

/** Server-only. Importing this from a client component will fail the build. */
export function serverEnv() {
  return {
    geminiKey: required("GEMINI_API_KEY", process.env.GEMINI_API_KEY),
  };
}

/**
 * Server-only. Only read where actually needed (the judge auto-login route)
 * so a misconfigured deployment doesn't fail to boot over a feature most
 * requests never touch. The service-role key is validated separately, in
 * createAdminClient, which is also used outside the judge flow.
 */
export function judgeEnv() {
  return {
    email: required("JUDGE_ACCOUNT_EMAIL", process.env.JUDGE_ACCOUNT_EMAIL),
    password: required("JUDGE_ACCOUNT_PASSWORD", process.env.JUDGE_ACCOUNT_PASSWORD),
  };
}
