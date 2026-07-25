import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <h1 className="font-display text-5xl font-extrabold tracking-tight">Nothing here</h1>
      <p className="mt-3 max-w-sm text-white/55">
        That page doesn&apos;t exist, or it belongs to a different shop.
      </p>
      <Link
        href="/dashboard"
        className="mt-7 rounded-xl bg-brand px-6 py-3 font-semibold text-navy transition hover:bg-brand-light"
      >
        Back to the ledger
      </Link>
    </main>
  );
}
