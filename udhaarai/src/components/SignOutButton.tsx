"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await createClient().auth.signOut();
        router.push("/");
        router.refresh();
      }}
      className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10"
    >
      <LogOut size={15} />
      <span className="hidden sm:inline">Sign out</span>
    </button>
  );
}
