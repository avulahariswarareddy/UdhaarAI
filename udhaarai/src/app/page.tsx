import Link from "next/link";
import Image from "next/image";
import { Transformations } from "@/components/Transformations";
import { HeroWorkflow } from "@/components/HeroWorkflow";
import { AdvisorShowcase } from "@/components/AdvisorShowcase";
import { Logo } from "@/components/Logo";
import { NotebookScene } from "@/components/NotebookScene";
import { LiveWordmark, TiltCard, CursorGlow, Reveal, CountUp } from "@/components/ShowcaseBits";
import {
  Camera, ScanLine, AlertTriangle, TrendingUp, MessageSquare, Languages,
  ShieldCheck, FileSpreadsheet, ArrowRight, Check, X, PlayCircle, Target, Keyboard,
} from "lucide-react";

/* ------------------------------------------------------------------ */
const STEPS = [
  { icon: Camera, t: "He writes it down anyway", d: "A customer calls, he notes it in the book mid-conversation. No app open, no typing, no interruption. Nothing changes about how he works." },
  { icon: ScanLine, t: "One photo at closing time", d: "End of day, he photographs the page. Hindi, Telugu, English, all three mixed — the reader handles the page as written." },
  { icon: AlertTriangle, t: "It shows him its doubts", d: "Every field carries a confidence score. Smudged amounts come back amber, not silently banked at 95%." },
  { icon: TrendingUp, t: "The ledger keeps itself", d: "Balances, ageing, who has gone quiet for four months. Updated the moment he confirms the page." },
];

const FEATURES = [
  { icon: ScanLine, t: "Reads the page, not just the text", d: "Knows a row is a customer, a credit and a payment — not a paragraph. That is the difference between a scanner and a ledger." },
  { icon: Target, t: "Tells you who to chase, with reasons", d: "A risk score built from age, repayment history and exposure. Every number shows its working. No model is asked to decide." },
  { icon: Languages, t: "Reminders in three languages", d: "English, Hindi, Telugu. Four tones. Editable before it goes anywhere near WhatsApp." },
  { icon: MessageSquare, t: "Ask it plainly", d: "\u201CWho hasn't paid in sixty days?\u201D Answered only from your own entries." },
  { icon: ShieldCheck, t: "Only you can read it", d: "Row Level Security on all seven tables. Photos in a private bucket behind one-hour signed links. 82 automated tests." },
  { icon: FileSpreadsheet, t: "Yours to take", d: "Full CSV export any time. No lock-in, no subscription wall on your own data." },
];

const COMPARE = [
  { f: "Starts from your handwritten page", us: true, khata: false, dukaan: "printed bills only", ocr: true },
  { f: "No typing or dictating to add an entry", us: true, khata: false, dukaan: false, ocr: true },
  { f: "Understands customers and running balances", us: true, khata: true, dukaan: true, ocr: false },
  { f: "Shows a confidence score per field", us: true, khata: null, dukaan: null, ocr: "partly" },
  { f: "Merges misspelled customer names", us: true, khata: false, dukaan: false, ocr: false },
  { f: "Hindi and Telugu handwriting", us: true, khata: null, dukaan: null, ocr: "partly" },
  { f: "WhatsApp reminders in local languages", us: true, khata: true, dukaan: true, ocr: false },
  { f: "Collection priority with stated reasons", us: true, khata: false, dukaan: false, ocr: false },
];

/* ------------------------------------------------------------------ */
export default function Showcase() {
  return (
    <main className="overflow-x-hidden">
      {/* ---------------- nav ---------------- */}
      <div className="sticky top-4 z-40 mx-auto w-full max-w-6xl px-4">
        <header className="liquid liquid-hover flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
          <Logo size="sm" />
          <nav className="hidden items-center gap-1 md:flex">
            {[["Why", "#why"], ["How", "#how"], ["Compare", "#compare"], ["Built", "#built"]].map(([l, h]) => (
              <a key={h} href={h} className="rounded-lg px-3 py-2 text-sm text-white/60 transition hover:bg-white/8 hover:text-white">
                {l}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/demo" className="rounded-xl border border-white/14 bg-white/8 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/14">
              Demo
            </Link>
            <Link href="/login" className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-navy transition hover:bg-brand-light active:scale-95">
              Sign in
            </Link>
          </div>
        </header>
      </div>

      {/* ---------------- hero ---------------- */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-16 pt-6 sm:pt-12">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3.5 py-1.5 text-xs text-brand">
          <ScanLine size={13} /> Reads handwritten Hindi, Telugu and English
        </div>

        <LiveWordmark />

        <p className="mt-7 max-w-2xl text-lg leading-relaxed text-white/60 sm:text-xl">
          Thirteen million Indian shops run on credit written in a paper notebook.
          Every app built to fix that asks the shopkeeper to stop writing and start typing.
          <span className="text-white"> This one doesn&apos;t.</span> He keeps the notebook.
          He photographs a page. The arithmetic disappears.
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/demo" className="inline-flex items-center gap-2 rounded-xl bg-brand px-7 py-4 font-semibold text-navy transition hover:bg-brand-light active:scale-95">
            <PlayCircle size={18} /> Open the live demo
          </Link>
          <a href="#why" className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-7 py-4 font-semibold transition hover:bg-white/10">
            Why it exists
          </a>
        </div>
        <p className="mt-3 text-sm text-white/35">No sign-up. Real interface, sample shop.</p>

        <Reveal delay={120}>
          <div className="mt-14">
            <HeroWorkflow />
            <p className="mt-3 text-center text-xs text-white/40">
              The notebook never leaves the counter. Everything downstream of it becomes automatic.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-center">
          <NotebookScene />
          <TiltCard className="liquid rounded-3xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono text-[11px] tracking-widest text-white/40">ROW 03</span>
              <span className="rounded-full bg-brand/15 px-2.5 py-0.5 font-mono text-[10px] text-brand">NEEDS YOUR EYES</span>
            </div>
            <Field label="CUSTOMER" v="Suresh Reddy" c={89} />
            <Field label="ITEMS" v="బియ్యం 25kg" c={81} />
            <Field label="CREDIT" v="1?50" c={48} flag note="Ink smudged across the third digit · could read as 1350" />
            <Field label="PAID" v="0" c={100} />
            <p className="mt-5 border-t border-white/8 pt-4 text-sm leading-relaxed text-white/50">
              A flagged wrong guess costs a second. A confident wrong guess costs the customer.
            </p>
          </TiltCard>
        </div>
      </section>

      {/* ---------------- the root cause ---------------- */}
      <section id="why" className="border-y border-white/6 bg-white/[0.02] py-20">
        <div className="mx-auto w-full max-w-4xl px-5">
          <Reveal>
            <p className="font-mono text-xs tracking-widest text-brand">THE ACTUAL PROBLEM</p>
            <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Nobody wants to stop writing.
              <br />
              <span className="text-white/45">Every app pretends otherwise.</span>
            </h2>
          </Reveal>

          <Reveal delay={120}>
            <div className="mt-9 space-y-5 text-base leading-relaxed text-white/60 sm:text-lg">
              <p>
                A customer phones in an order. The shopkeeper is holding the phone in one hand and
                a pen in the other, and he writes it in the book while they talk. That takes three
                seconds and needs no signal, no battery, no login, no reading.
              </p>
              <p>
                Now picture the alternative. Unlock the phone. Find the app. Wait for it to load.
                Search for the customer. Tap through to add an entry. Type the amount. Save. All
                while somebody is still talking on the other end.
              </p>
              <p className="text-white">
                That is why the paper wins. Not because shopkeepers are behind the times — because
                for the thing they are actually doing, paper is genuinely faster. Many of them are
                not comfortable readers either, and a dense mobile interface is a wall.
              </p>
              <p>
                So the paper stays. UdhaarAI meets it at the end of the day instead of trying to
                replace it at the start. One photo, and everything that was written by hand is
                searchable, totalled, backed up, and ready to chase.
              </p>
            </div>
          </Reveal>

          <Reveal delay={220}>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <Stat n={13} suffix=" million" l="kirana shops in India" />
              <Stat n={3} suffix=" seconds" l="to write a line by hand" />
              <Stat n={0} suffix="" l="entries you have to type" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- how it works ---------------- */}
      <section className="mx-auto w-full max-w-6xl px-5 py-20">
        <Reveal>
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">How a day actually goes</h2>
          <p className="mt-3 max-w-lg text-white/55">The order matters — confirmation sits before the ledger, never after.</p>
        </Reveal>

        <ol className="mt-10 grid gap-5 sm:grid-cols-2">
          {STEPS.map((s, i) => (
            <Reveal key={s.t} delay={i * 90}>
              <TiltCard intensity={6} className="liquid liquid-hover h-full rounded-2xl p-6">
                <div className="mb-4 flex items-center gap-3">
                  <span className="font-mono text-xs text-brand">{String(i + 1).padStart(2, "0")}</span>
                  <s.icon size={19} className="text-brand" />
                </div>
                <h3 className="font-display text-lg font-bold">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{s.d}</p>
              </TiltCard>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ---------------- what changes ---------------- */}
      <section className="mx-auto w-full max-w-5xl px-5 py-20">
        <Reveal>
          <p className="font-mono text-xs tracking-widest text-brand">WHAT CHANGES</p>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Nothing about how he works.
            <br />
            <span className="text-white/45">Everything about what it costs him.</span>
          </h2>
        </Reveal>
        <Transformations />
      </section>

      {/* ---------------- comparison ---------------- */}
      <section id="compare" className="border-y border-white/6 bg-white/[0.02] py-20">
        <div className="mx-auto w-full max-w-5xl px-5">
          <Reveal>
            <p className="font-mono text-xs tracking-widest text-brand">WHERE IT SITS</p>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Between two things that already exist
            </h2>
            <p className="mt-4 max-w-2xl text-white/60">
              Khatabook and OkCredit are good products with millions of users — but every entry is
              typed by hand. Dukaan AI removes the typing with voice, and its AI scanner reads
              <em className="text-white/75"> printed</em> purchase bills, not a handwritten khata page.
              Transkribus and Pen to Print read handwriting beautifully — and hand back text, not a
              ledger. Each solves a piece. None starts from the page already written.
            </p>
          </Reveal>

          <Reveal delay={140}>
            <div className="mt-9 overflow-x-auto">
              <table className="w-full min-w-[780px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="p-3 text-left font-normal text-white/40"></th>
                    <th className="p-3 text-left font-display text-base font-bold text-brand">UdhaarAI</th>
                    <th className="p-3 text-left font-normal text-white/50">Khatabook / OkCredit</th>
                    <th className="p-3 text-left font-normal text-white/50">Dukaan AI</th>
                    <th className="p-3 text-left font-normal text-white/50">Handwriting OCR tools</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map((r) => (
                    <tr key={r.f} className="border-b border-white/5 transition hover:bg-white/[0.03]">
                      <td className="p-3 text-white/70">{r.f}</td>
                      <td className="p-3"><Mark v={r.us} /></td>
                      <td className="p-3"><Mark v={r.khata} /></td>
                      <td className="p-3"><Mark v={r.dukaan} /></td>
                      <td className="p-3"><Mark v={r.ocr} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-white/35">
              Compared on each product&apos;s own public description, July 2026. Only apps we could verify
              are listed. These are all good products and all better than paper — the claim here is narrow:
              none of them begin with the page you already wrote by hand.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------------- features ---------------- */}
      <CursorGlow className="py-20">
        <div className="mx-auto w-full max-w-6xl px-5">
          <Reveal>
            <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">What is actually built</h2>
            <p className="mt-3 max-w-lg text-white/55">Every one of these is in the demo. Nothing on this page is a mockup of a plan.</p>
          </Reveal>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.t} delay={i * 70}>
                <TiltCard intensity={7} className="liquid liquid-hover h-full rounded-2xl p-6">
                  <f.icon size={20} className="mb-4 text-good" />
                  <h3 className="font-display text-lg font-bold">{f.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/55">{f.d}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </CursorGlow>

      {/* ---------------- engineering ---------------- */}
      <section id="built" className="border-y border-white/6 bg-white/[0.02] py-20">
        <div className="mx-auto w-full max-w-5xl px-5">
          <Reveal>
            <p className="font-mono text-xs tracking-widest text-brand">UNDER IT</p>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              The model is checked, not trusted
            </h2>
            <p className="mt-4 max-w-2xl text-white/60">
              Gemini reads the page. Everything after that is deterministic code that can be tested,
              and is. If the model reports 95% confidence on a nine-digit phone number, the structural
              check overrules it.
            </p>
          </Reveal>

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "Indic numerals", d: "Devanagari and Telugu digits rewritten before any arithmetic. Pure lookup." },
              { n: "Name matching", d: "Jaro-Winkler plus a phonetic key. \u201CYadhav\u201D merges into \u201CYadav\u201D; \u201CSuresh Yadav\u201D does not." },
              { n: "Arithmetic audit", d: "Running balances reconciled across rows. Catches dropped zeros the model cannot know it dropped." },
              { n: "Risk scoring", d: "Pure TypeScript with stated reasons. No model is asked who to chase." },
            ].map((x, i) => (
              <Reveal key={x.n} delay={i * 80}>
                <div className="liquid liquid-hover h-full rounded-2xl p-5">
                  <h3 className="font-display font-bold text-brand">{x.n}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/55">{x.d}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={260}>
            <div className="liquid mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl p-5 font-mono text-sm">
              <span className="text-good"><CountUp to={82} /> tests passing</span>
              <span className="text-white/45">7 tables, RLS on all</span>
              <span className="text-white/45">private storage bucket</span>
              <span className="text-white/45">build fails if a test does</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- AI advisor flagship ---------------- */}
      <section id="advisor" className="mx-auto w-full max-w-5xl px-5 py-20">
        <Reveal>
          <p className="font-mono text-xs tracking-widest text-brand">THE FLAGSHIP</p>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            It doesn't wait to be asked
          </h2>
          <p className="mt-4 max-w-2xl text-white/60">
            Most tools answer questions. UdhaarAI watches the ledger and tells you what needs
            attention — who to collect from, where money is leaking, when a festival is about to
            stretch your credit. Every line is computed from your own numbers, with the reason shown.
          </p>
        </Reveal>
        <div className="mt-9"><AdvisorShowcase /></div>
      </section>

      {/* ---------------- more than OCR ---------------- */}
      <section className="border-y border-white/6 bg-white/[0.02] py-20">
        <div className="mx-auto w-full max-w-5xl px-5">
          <Reveal>
            <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              More than a notebook scanner
            </h2>
            <p className="mt-3 max-w-xl text-white/55">
              Reading the page is where it starts, not where it stops.
            </p>
          </Reveal>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { e: "\uD83D\uDCF8", t: "Understands handwritten notebooks", d: "Hindi, Telugu and English on the same faded page." },
              { e: "\uD83E\uDDE0", t: "Checks itself before saving", d: "Every field scored; anything uncertain waits for you." },
              { e: "\uD83D\uDC65", t: "Manages customers intelligently", d: "Merges misspelled names, scores who repays reliably." },
              { e: "\uD83D\uDCB0", t: "Tracks income, expenses and profit", d: "Not just who owes what — what the shop actually keeps." },
              { e: "\uD83D\uDCCA", t: "Reads the business, not just the page", d: "Health score, ageing, collection priority, all explained." },
              { e: "\uD83E\uDD16", t: "Advises, in your language", d: "Proactive, plain advice through text or voice in three languages." },
            ].map((x, i) => (
              <Reveal key={x.t} delay={i * 70}>
                <TiltCard intensity={7} className="liquid liquid-hover h-full rounded-2xl p-6">
                  <div className="text-2xl">{x.e}</div>
                  <h3 className="mt-3 font-display text-base font-bold">{x.t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/55">{x.d}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- cta ---------------- */}
      <section className="mx-auto w-full max-w-5xl px-5 py-24">
        <Reveal>
          <TiltCard intensity={4} className="liquid rounded-3xl p-10 text-center sm:p-16">
            <Keyboard size={26} className="mx-auto mb-5 text-brand" />
            <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
              Don&apos;t take the claim. Click it.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-white/55">
              The demo is the real interface with a sample shop loaded. Review a page, watch the
              flagged field, see who it says to chase and why.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link href="/demo" className="inline-flex items-center gap-2 rounded-xl bg-brand px-7 py-4 font-semibold text-navy transition hover:bg-brand-light active:scale-95">
                <PlayCircle size={18} /> Open the demo
              </Link>
              <Link href="/login" className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-7 py-4 font-semibold transition hover:bg-white/10">
                Set up my shop <ArrowRight size={17} />
              </Link>
            </div>
          </TiltCard>
        </Reveal>
      </section>

      <footer className="border-t border-white/6 py-12">
        <div className="mx-auto w-full max-w-6xl px-5">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <Logo size="sm" />
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/40">
              <Link href="/demo" className="transition hover:text-white">Demo</Link>
              <a href="#why" className="transition hover:text-white">Why it exists</a>
              <a href="#compare" className="transition hover:text-white">Comparison</a>
              <Link href="/login" className="transition hover:text-white">Sign in</Link>
            </div>
          </div>

          <div className="mt-9 grid gap-6 border-t border-white/6 pt-8 sm:grid-cols-2">
            <div>
              <h3 className="font-display text-base font-bold">Help &amp; support</h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/50">
                Need help, have feedback, or found an issue? Feel free to reach out.
              </p>
              <a href="mailto:avulahariswarareddy@gmail.com"
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10">
                avulahariswarareddy@gmail.com
              </a>
            </div>
            <div className="sm:text-right">
              <h3 className="font-display text-base font-bold">Developer</h3>
              <p className="mt-2 text-sm text-white/50">Avula Hariswara Reddy</p>
              <p className="mt-1 text-sm text-white/30">Hyderabad, India</p>
            </div>
          </div>

          <div className="mt-8 border-t border-white/6 pt-6">
            <p className="text-sm leading-relaxed text-white/40">
              This is a vibe coded website, built by{" "}
              <span className="font-semibold text-white/70">Avula Hariswara Reddy</span> in
              Hyderabad, India. Built for the shops that still write it down.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ------------------------------------------------------------------ */
function Field({ label, v, c, flag, note }: { label: string; v: string; c: number; flag?: boolean; note?: string }) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between">
        <span className={`font-mono text-[10px] tracking-widest ${flag ? "text-brand" : "text-white/40"}`}>{label}</span>
        <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${flag ? "bg-brand/15 text-brand" : "bg-good/12 text-good"}`}>{c}%</span>
      </div>
      <div className={`rounded-lg px-3 py-2.5 text-sm ${flag ? "field-flag border" : "border border-white/10 bg-white/5"}`}>{v}</div>
      {note && <p className="mt-1.5 text-[11px] leading-relaxed text-brand/80">{note}</p>}
    </div>
  );
}

function Stat({ n, suffix, l }: { n: number; suffix: string; l: string }) {
  return (
    <div className="liquid liquid-hover rounded-2xl p-5">
      <div className="font-display text-3xl font-extrabold text-brand sm:text-4xl">
        <CountUp to={n} suffix={suffix} />
      </div>
      <div className="mt-2 text-sm text-white/55">{l}</div>
    </div>
  );
}

function Mark({ v }: { v: boolean | null | string }) {
  if (v === true) return <Check size={17} className="text-good" />;
  if (v === false) return <X size={17} className="text-white/25" />;
  if (v === null) return <span className="text-xs text-white/25">not stated</span>;
  return <span className="text-xs leading-tight text-amber-300/80">{v}</span>;
}
