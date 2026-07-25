import { createClient, getUser } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/SettingsForm";
import { LogoUpload } from "@/components/LogoUpload";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name, business_address, preferred_language, logo_path")
    .eq("id", user!.id)
    .maybeSingle();

  // Signed URL so the private bucket stays private.
  let logoUrl: string | null = null;
  if (profile?.logo_path) {
    const { data: signed } = await supabase.storage
      .from("notebooks")
      .createSignedUrl(profile.logo_path, 60 * 60);
    logoUrl = signed?.signedUrl ?? null;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Settings</h1>
      <p className="mt-2 text-white/55">
        Your shop name appears in the reminders you send.
      </p>

      <SettingsForm
        initial={{
          business_name: profile?.business_name ?? "",
          business_address: profile?.business_address ?? "",
          preferred_language: (profile?.preferred_language ?? "en") as "en" | "hi" | "te",
        }}
      />

      <div className="mt-5">
        <LogoUpload initialUrl={logoUrl} />
      </div>

      <div className="glass mt-5 rounded-2xl p-5">
        <h2 className="font-display text-lg font-bold">Your data</h2>
        <p className="mt-1 text-sm text-white/50">
          The ledger is yours. Take a copy whenever you want, in a format any spreadsheet opens.
        </p>
        <a
          href="/api/export"
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10"
        >
          <Download size={15} /> Download everything as CSV
        </a>
      </div>

      <div className="glass mt-5 rounded-2xl p-5">
        <h2 className="font-display text-lg font-bold">Account</h2>
        <p className="mt-1 font-mono text-sm text-white/50">{user?.email}</p>
      </div>
    </div>
  );
}
