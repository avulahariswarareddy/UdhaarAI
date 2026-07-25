"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Eye, HelpCircle, Trash2, Lock, ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Guide } from "@/components/Guide";

const POINTS = [
  { icon: Lock, t: "Your notebook stays yours", d: "Pages you upload are stored in a private bucket only your account can open, behind links that expire in an hour." },
  { icon: Eye, t: "Nobody else can read your ledger", d: "Row Level Security on every table means another shop's account cannot see a single row of yours, even by accident." },
  { icon: HelpCircle, t: "The AI asks when it isn't sure", d: "Uncertain handwriting is flagged for you to confirm. Nothing doubtful is saved to your books without you seeing it." },
  { icon: Trash2, t: "You can take it or delete it", d: "Export the whole ledger to CSV whenever you want, and delete your account and every page with it." },
];

export function TermsGate() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function accept() {
    if (!agreed) return;
    setBusy(true);
    const res = await fetch("/api/terms", { method: "POST" });
    setBusy(false);
    if (!res.ok) return toast.error("Could not record that. Try again.");
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-5 py-12">
      {/* floating background — the same motifs as the hero, so the journey
          from landing page to sign-in to here reads as one continuous place */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        {[
          { l: "8%", t: "14%", s: 130, d: "0s" },
          { l: "78%", t: "10%", s: 90, d: "1.6s" },
          { l: "86%", t: "62%", s: 150, d: "0.8s" },
          { l: "12%", t: "70%", s: 100, d: "2.4s" },
        ].map((p, i) => (
          <div key={i} className="absolute rounded-3xl border border-brand/10 bg-brand/[0.04]"
            style={{
              left: p.l, top: p.t, width: p.s, height: p.s * 1.3,
              animation: `float 9s ease-in-out ${p.d} infinite`,
              transform: `rotate(${i % 2 ? 8 : -6}deg)`,
            }} />
        ))}
      </div>

      <div className="relative w-full max-w-xl">
        <div className="liquid rounded-3xl p-7 sm:p-9">
          <div className="flex items-start justify-between gap-4">
            <Logo />
            <div className="hidden shrink-0 sm:block"><Guide pose="explain" size={72} /></div>
          </div>

          <h1 className="mt-7 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Before we open your ledger
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/55">
            The short version, in plain words. The full documents are linked below and
            you should read them, but here is what actually matters.
          </p>

          <ul className="mt-7 space-y-3">
            {POINTS.map((p) => (
              <li key={p.t} className="flex gap-3.5 rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                <p.icon size={18} className="mt-0.5 shrink-0 text-good" />
                <div>
                  <div className="font-display text-sm font-bold">{p.t}</div>
                  <p className="mt-1 text-[13px] leading-relaxed text-white/50">{p.d}</p>
                </div>
              </li>
            ))}
          </ul>

          <label className="mt-7 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.07]">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#F59E0B]"
            />
            <span className="text-sm leading-relaxed text-white/75">
              I have read and agree to the{" "}
              <Link href="/terms" target="_blank" className="text-brand underline underline-offset-2 hover:text-brand-light">
                Terms &amp; Conditions
              </Link>{" "}
              and{" "}
              <Link href="/terms#privacy" target="_blank" className="text-brand underline underline-offset-2 hover:text-brand-light">
                Privacy Policy
              </Link>.
            </span>
          </label>

          <button
            onClick={accept}
            disabled={!agreed || busy}
            className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3.5 font-semibold text-navy transition hover:bg-brand-light active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {busy ? <Loader2 size={17} className="animate-spin" /> : <ShieldCheck size={17} />}
            Agree and continue
          </button>

          {!agreed && (
            <p className="mt-2.5 text-center text-xs text-white/35">
              Tick the box above to continue.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
