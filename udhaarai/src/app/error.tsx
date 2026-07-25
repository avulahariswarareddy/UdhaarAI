"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">
        That didn&apos;t load
      </h1>
      <p className="mt-3 max-w-sm text-white/55">
        Something broke on our side. Your ledger is untouched.
      </p>
      <button
        onClick={reset}
        className="mt-7 rounded-xl bg-brand px-6 py-3 font-semibold text-navy transition hover:bg-brand-light"
      >
        Try again
      </button>
    </main>
  );
}
