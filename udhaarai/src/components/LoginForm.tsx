"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Mail, ArrowLeft, ArrowRight, Trophy, Rocket } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  // Open-redirect guard. A protocol-relative value like "//evil.com" is a
  // valid argument to router.push and would send the user offsite carrying
  // a fresh session. Only same-origin paths are allowed through.
  const rawNext = params.get("next") ?? "/dashboard";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const supabase = createClient();
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

  async function sendCode() {
    if (!validEmail) return toast.error("That email address doesn't look right.");
    setBusy(true);
    // Goes through our own route so the request is rate limited before it
    // ever reaches Supabase.
    const res = await fetch("/api/auth/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) return toast.error(json.error ?? "Could not send a code right now.");
    setStep("otp");
    toast.success("Code sent. Check your inbox.");
  }

  async function verifyCode() {
    if (code.trim().length < 6) return toast.error("Enter the six-digit code.");
    setBusy(true);
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), token: code.trim() }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) return toast.error(json.error ?? "That code didn't work.");
    router.push(next);
    router.refresh();
  }

  async function google() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setBusy(false);
      toast.error("Google sign-in is unavailable right now.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-white/45 hover:text-white">
          <ArrowLeft size={15} /> Back
        </Link>

        <div className="glass rounded-3xl p-7 sm:p-9">
          <Logo />

          <h1 className="mt-7 font-display text-2xl font-extrabold tracking-tight">
            {step === "email" ? "Open your ledger" : "Enter the code"}
          </h1>
          <p className="mt-2 text-sm text-white/50">
            {step === "email"
              ? "We'll email you a six-digit code. No password to remember."
              : `Sent to ${email}. It expires in a few minutes.`}
          </p>

          {step === "email" ? (
            <div className="mt-7 space-y-4">
              <div>
                <label htmlFor="email" className="mb-2 block font-mono text-[11px] tracking-widest text-white/45">
                  EMAIL
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendCode()}
                  placeholder="you@shop.in"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-brand/60"
                />
              </div>

              <button
                onClick={sendCode}
                disabled={busy || !validEmail}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3.5 font-semibold text-navy transition hover:bg-brand-light active:scale-95 disabled:opacity-40"
              >
                {busy ? <Loader2 size={17} className="animate-spin" /> : <Mail size={17} />}
                Email me a code
              </button>

              <div className="flex items-center gap-3 py-1">
                <span className="h-px flex-1 bg-white/10" />
                <span className="font-mono text-[10px] tracking-widest text-white/30">OR</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <button
                onClick={google}
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-3.5 font-semibold transition hover:bg-white/10 disabled:opacity-40"
              >
                Continue with Google
              </button>
            </div>
          ) : (
            <div className="mt-7 space-y-4">
              <div>
                <label htmlFor="code" className="mb-2 block font-mono text-[11px] tracking-widest text-white/45">
                  SIX-DIGIT CODE
                </label>
                <input
                  id="code"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && verifyCode()}
                  placeholder="000000"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] outline-none focus:border-brand/60"
                />
              </div>

              <button
                onClick={verifyCode}
                disabled={busy || code.length < 6}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3.5 font-semibold text-navy transition hover:bg-brand-light active:scale-95 disabled:opacity-40"
              >
                {busy ? <Loader2 size={17} className="animate-spin" /> : <ArrowRight size={17} />}
                Open my ledger
              </button>

              <button
                onClick={() => { setStep("email"); setCode(""); }}
                className="w-full py-2 text-sm text-white/45 hover:text-white"
              >
                Use a different email
              </button>
            </div>
          )}
        </div>

        {step === "email" && (
          <div className="judge-glow relative mt-6 overflow-hidden rounded-3xl border border-brand/25 bg-gradient-to-br from-brand/[0.1] via-white/[0.03] to-transparent p-6 backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <div className="shrink-0 overflow-hidden rounded-2xl border border-brand/25 shadow-lg shadow-brand/20">
                <Image src="/brand/tks-poster.png" alt="TKS Prompt to Product Challenge" width={56} height={56} className="h-14 w-14 object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] tracking-widest text-brand">
                  <Trophy size={13} /> TKS PROMPT TO PRODUCT CHALLENGE JUDGES
                </div>
                <h2 className="mt-1 font-display text-lg font-bold">Welcome!</h2>
              </div>
            </div>

            <p className="mt-3.5 text-sm leading-relaxed text-white/75">
              We&apos;ve prepared something special so you can explore UdhaarAI without spending time
              creating an account. This is the real application — realistic customers, transactions,
              expenses, AI insights, WhatsApp reminders, OCR history, dashboards and analytics, all
              already set up. Try the AI, edit data, record payments, add customers — click every button.
            </p>

            <Link
              href="/demo"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3.5 font-semibold text-navy shadow-lg shadow-brand/25 transition hover:bg-brand-light hover:shadow-brand/40 active:scale-95"
            >
              <Rocket size={17} /> Enter Judge Workspace
            </Link>
            <p className="mt-2.5 text-center text-[11px] tracking-wide text-white/40">
              One click · no email · no password · no OTP
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
