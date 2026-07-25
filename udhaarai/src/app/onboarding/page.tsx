import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/OnboardingForm";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name, business_address, owner_phone, business_type, onboarded, terms_accepted_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.terms_accepted_at) redirect("/accept-terms");
  if (profile?.onboarded) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-lg">
        <div className="glass rounded-3xl p-7 sm:p-9">
          <Logo />
          <h1 className="mt-7 font-display text-2xl font-extrabold tracking-tight">
            Tell us about the shop
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Your shop name goes on every reminder you send, so customers know who is asking.
            This takes about thirty seconds.
          </p>
          <OnboardingForm
            initial={{
              business_name: profile?.business_name === "My Shop" ? "" : (profile?.business_name ?? ""),
              business_address: profile?.business_address ?? "",
              owner_phone: profile?.owner_phone ?? "",
              business_type: profile?.business_type ?? "kirana",
            }}
          />
        </div>
      </div>
    </main>
  );
}
