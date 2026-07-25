import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Terms & Privacy — UdhaarAI" };

const S = ({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) => (
  <section id={id} className="mt-10 scroll-mt-24">
    <h2 className="font-display text-xl font-bold text-white">{title}</h2>
    <div className="mt-3 space-y-3 text-sm leading-relaxed text-white/60">{children}</div>
  </section>
);

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-white/45 hover:text-white">
        <ArrowLeft size={15} /> Back
      </Link>
      <Logo />

      <h1 className="mt-8 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
        Terms &amp; Privacy
      </h1>
      <p className="mt-3 text-sm text-white/45">Version 1.0 · July 2026</p>

      <S title="What this is">
        <p>
          UdhaarAI reads photographs of handwritten credit ledgers and turns them into a
          searchable digital record. You keep your paper notebook; this stores what is written
          in it.
        </p>
        <p>
          It is a bookkeeping aid, not an accounting or legal authority. Figures it extracts
          are a convenience, and you remain responsible for what your books say.
        </p>
      </S>

      <S title="Accuracy and your confirmation">
        <p>
          Handwriting recognition is never perfect. Every field carries a confidence score, and
          anything uncertain is shown to you before it is saved. By confirming a page you accept
          the values as read.
        </p>
        <p>
          We do not guarantee that extraction is correct, and we are not liable for losses
          arising from a figure you confirmed. Check flagged fields against the original page.
        </p>
      </S>

      <S title="Your account">
        <p>
          You need an email address to sign in. You are responsible for keeping access to that
          inbox secure, since sign-in codes are sent there.
        </p>
        <p>
          One account is meant for one shop. Do not use the service to store other people&apos;s
          ledgers without their knowledge.
        </p>
      </S>

      <S title="Acceptable use">
        <p>
          Do not upload material you have no right to, and do not use the reminder feature to
          harass, threaten, or publicly shame anyone. Reminders are for asking politely about
          money owed.
        </p>
      </S>

      <S title="Data we hold" id="privacy">
        <p>We store only what the service needs to work:</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>Your email address, shop name, address and mobile number.</li>
          <li>Photographs of notebook pages you upload.</li>
          <li>The ledger entries extracted from them, and any corrections you make.</li>
          <li>Reminders you generate, and a log of significant account actions.</li>
        </ul>
      </S>

      <S title="Who can see it">
        <p>
          Only your account. Every table enforces row-level access rules tied to your user id,
          and uploaded pages sit in a private store reachable only through short-lived links
          issued to you.
        </p>
        <p>
          Page images and ledger text are sent to Google&apos;s Gemini API to be read, and to
          write reminders. That processing is subject to Google&apos;s terms. Nothing is sold,
          and nothing is shared with advertisers.
        </p>
      </S>

      <S title="Taking your data out, and deleting it">
        <p>
          Export the full ledger to CSV at any time from Settings. Deleting your account removes
          your ledger, your uploaded page images, and your profile.
        </p>
        <p>Backups may retain copies for a short period before they roll off.</p>
      </S>

      <S title="Demo mode">
        <p>
          The demo uses invented data for a fictional shop. Nothing you type there is saved, and
          it needs no account.
        </p>
      </S>

      <S title="Changes and contact">
        <p>
          If these terms change materially you will be asked to accept the new version at
          sign-in. For anything else, contact the shop owner account that set this up for you.
        </p>
      </S>

      <p className="mt-12 border-t border-white/8 pt-6 text-sm text-white/35">
        Built by Avula Hariswara Reddy in Hyderabad, India.
      </p>
    </main>
  );
}
