import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser, createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { AssistantDock } from "@/components/AssistantDock";
import { LayoutGrid, Camera, Users, MessageSquare, Settings, Target, Wallet } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/dashboard/upload", label: "Add page", icon: Camera },
  { href: "/dashboard/collections", label: "Collect", icon: Target },
  { href: "/dashboard/expenses", label: "Expenses", icon: Wallet },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/assistant", label: "Ask", icon: MessageSquare },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");

  // Onboarding gate, enforced on the server. The middleware can't do this
  // without a database round trip on every request, so it lives here —
  // every dashboard route renders through this layout.
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded, terms_accepted_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.terms_accepted_at) redirect("/accept-terms");
  if (!profile?.onboarded) redirect("/onboarding");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/6 bg-navy/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/dashboard"><Logo size="sm" /></Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-white/40 sm:block">{user.email}</span>
            <SignOutButton />
          </div>
        </div>

        <nav className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto no-scrollbar px-2 pb-2 sm:px-5">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm text-white/60 transition hover:bg-white/8 hover:text-white"
            >
              <n.icon size={15} />
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6">{children}</main>
      <AssistantDock mode="live" />
    </div>
  );
}
