import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { TermsGate } from "@/components/TermsGate";

export const dynamic = "force-dynamic";

export default async function AcceptTermsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles").select("terms_accepted_at").eq("id", user.id).maybeSingle();

  if (data?.terms_accepted_at) redirect("/onboarding");
  return <TermsGate />;
}
