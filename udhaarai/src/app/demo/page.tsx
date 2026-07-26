"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  LayoutGrid, ScanLine, Target, Users, MessageSquare,
  AlertTriangle, Check, ArrowLeft, Send, Phone, Sparkles, Copy,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { AssistantDock } from "@/components/AssistantDock";
import { DemoWelcome } from "@/components/DemoWelcome";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";
import { ActionNoteDemo } from "@/components/ActionNoteDemo";
import { LazyTrendChart } from "@/components/LazyTrendChart";
import { AgeingBars } from "@/components/AgeingBars";
import { rupee, timeAgo } from "@/lib/utils";
import { quoteOfTheDay, formatToday } from "@/lib/quotes";
import { DemoReceipt } from "@/components/DemoReceipt";
import { DemoHealthAdvice } from "@/components/DemoHealthAdvice";
import { DemoReminder } from "@/components/DemoReminder";
import { collectionWorklist, ageingBuckets, recoveryOutlook, assessRisk } from "@/lib/verify/risk";
import { businessHealth, businessAdvisor, customerTrust } from "@/lib/verify/insights";
import {
  DEMO_CUSTOMERS, DEMO_TRANSACTIONS, DEMO_REVIEW, DEMO_TREND, DEMO_ANSWERS,
} from "@/lib/demo-data";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "review", label: "Review a page", icon: ScanLine },
  { id: "collect", label: "Collect", icon: Target },
  { id: "customers", label: "Customers", icon: Users },
  { id: "ask", label: "Ask", icon: MessageSquare },
] as const;
type Tab = (typeof TABS)[number]["id"];

const BAND = {
  stale: { chip: "bg-red-500/15 text-red-400", label: "Gone quiet" },
  overdue: { chip: "bg-brand/15 text-brand", label: "Overdue" },
  due: { chip: "bg-amber-400/12 text-amber-300", label: "Due" },
  watch: { chip: "bg-white/8 text-white/50", label: "Watch" },
} as const;

const TOUR: TourStep[] = [
  { tab: "overview", target: "note", pose: "wave", title: "Just say what you want",
    body: "This is the Note. Type or speak \u201CRamesh paid 500\u201D and I understand it — no menus, no forms. It's the fastest way to run the shop." },
  { tab: "review", target: "review", pose: "search", title: "Every field is checked",
    body: "When a page is scanned, I score each field. Anything I'm unsure of turns amber and waits for you — I never bank a guess." },
  { tab: "overview", target: "stats", pose: "point-up", title: "Your day at a glance",
    body: "Collected, outstanding, what you kept after expenses. It totals itself the moment you confirm a page." },
  { tab: "overview", target: "advisor", pose: "proud", title: "It watches the numbers for you",
    body: "A health score and proactive advice — collect from this customer, expenses are up, a festival's coming. Computed from your ledger, with the reason shown." },
  { tab: "overview", target: "reminder", pose: "point-down", title: "Reminders that sound like you",
    body: "Every message is written from that customer's own history — what they last paid, how long they've been with you. A loyal payer and a silent account get very different words." },
  { tab: "collect", target: "collect", pose: "explain", title: "Who to chase, and why",
    body: "I rank who to follow up with — by how old and how risky the debt is, with the reason shown. Not just biggest first." },
  { tab: "ask", target: "ask", pose: "think", title: "Ask me anything",
    body: "\u201CWho hasn't paid in sixty days?\u201D \u201CHow much profit this month?\u201D I answer from your real ledger, never made up." },
];

const WELCOME_SEEN_KEY = "udhaarai-demo-welcome-seen";

export default function DemoPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [phase, setPhase] = useState<"welcome" | "tour" | "explore">("welcome");

  // The welcome screen is a one-time introduction, not something to
  // re-show every time a judge navigates back to the demo mid-session.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(WELCOME_SEEN_KEY) === "1") setPhase("explore");
    } catch {
      // sessionStorage unavailable — just show the welcome screen as normal.
    }
  }, []);

  function leaveWelcome(next: "tour" | "explore") {
    try {
      sessionStorage.setItem(WELCOME_SEEN_KEY, "1");
    } catch {
      // Ignore — worst case the welcome screen reappears next visit.
    }
    setPhase(next);
  }

  const outstanding = DEMO_CUSTOMERS.reduce((s, c) => s + c.outstanding, 0);
  const collected = DEMO_CUSTOMERS.reduce((s, c) => s + c.paid, 0);
  const worklist = useMemo(() => collectionWorklist(DEMO_CUSTOMERS), []);
  const buckets = useMemo(() => ageingBuckets(DEMO_CUSTOMERS), []);
  const outlook = useMemo(() => recoveryOutlook(DEMO_CUSTOMERS), []);

  return (
    <div className="min-h-screen">
      {phase === "welcome" && (
        <DemoWelcome onStart={() => leaveWelcome("tour")} onSkip={() => leaveWelcome("explore")} />
      )}
      {phase === "tour" && (
        <GuidedTour steps={TOUR} onGoToTab={(x) => setTab(x as Tab)} onExit={() => setPhase("explore")} />
      )}
      {/* demo banner */}
      <div className="sticky top-0 z-40 border-b border-brand/20 bg-brand/10 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <p className="text-sm">
            <span className="font-semibold text-brand">Demo</span>
            <span className="text-white/60"> — real interface, sample shop. Nothing is saved.</span>
          </p>
          <div className="flex gap-2">
            <Link href="/" className="rounded-lg border border-white/12 bg-white/5 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/10">
              <ArrowLeft size={12} className="mr-1 inline" /> Back
            </Link>
            <Link href="/login" className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-navy transition hover:bg-brand-light">
              Use my own shop
            </Link>
          </div>
        </div>
      </div>

      <header className="border-b border-white/6">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6">
          <Logo size="sm" />
        </div>
        <nav className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto no-scrollbar px-2 pb-2 sm:px-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition ${
                tab === t.id ? "bg-brand text-navy font-semibold" : "text-white/60 hover:bg-white/8 hover:text-white"
              }`}
            >
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6">
        {tab === "overview" && (
          <>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="font-display text-3xl font-extrabold tracking-tight">Overview</h1>
                <p className="mt-1 text-sm text-white/50">Sunrise General Store · {formatToday()}</p>
              </div>
              <div className="liquid flex max-w-md items-center gap-3 rounded-2xl px-4 py-3">
                <span className="text-sm italic leading-snug text-white/70">{quoteOfTheDay().text}</span>
              </div>
            </div>

            <div data-tour="stats" className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Card label="Outstanding" value={rupee(outstanding)} tone="brand" />
              <Card label="Collected" value={rupee(collected)} tone="good" />
              <Card label="Likely to recover" value={rupee(outlook.likely)} tone="good" />
              <Card label="At risk" value={rupee(outlook.atRisk)} tone="brand" />
            </div>

            <div data-tour="advisor" className="mt-5">
              <DemoHealthAdvice />
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
              <div className="glass rounded-2xl p-5">
                <h2 className="font-display text-lg font-bold">Last fourteen days</h2>
                <p className="mb-4 text-sm text-white/45">Credit given against money collected</p>
                <LazyTrendChart data={DEMO_TREND.map((d) => ({ day: d.day, credit: d.credit, payment: d.payment }))} />
              </div>
              <div className="glass rounded-2xl p-5">
                <h2 className="font-display text-lg font-bold">How old the money is</h2>
                <p className="mb-4 text-sm text-white/45">Computed from payment dates, no model involved</p>
                <AgeingBars buckets={buckets} />
              </div>
            </div>

            <div data-tour="note" className="mt-5"><ActionNoteDemo /></div>
            <div data-tour="reminder" className="mt-5"><DemoReminder /></div>
            <div className="mt-5"><DemoReceipt /></div>

            <div className="glass mt-5 rounded-2xl p-5">
              <h2 className="mb-4 font-display text-lg font-bold">Recent entries</h2>
              <ul className="space-y-1">
                {DEMO_TRANSACTIONS.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-white/5">
                    <span className="font-mono text-xs text-white/40">{t.date}</span>
                    <span className="flex-1 truncate">{t.customer}</span>
                    <span className="hidden flex-1 truncate text-white/45 sm:block">{t.items}</span>
                    <span className="font-mono">
                      {t.credit > 0 && <span className="text-brand">+{rupee(t.credit)}</span>}
                      {t.payment > 0 && <span className="text-good">−{rupee(t.payment)}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {tab === "review" && <div data-tour="review"><ReviewDemo /></div>}

        {tab === "collect" && (
          <div data-tour="collect">
            <h1 className="font-display text-3xl font-extrabold tracking-tight">Today&apos;s collections</h1>
            <p className="mt-1.5 max-w-2xl text-white/55">
              Ordered by how likely each balance is to go bad — not just by size. Every score shows its
              reasoning, because a shopkeeper should never be told who to chase without being told why.
            </p>

            <div className="mt-6 space-y-3">
              {worklist.map(({ customer, risk }) => (
                <div key={customer.id} className="glass rounded-2xl p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/15 font-display text-lg font-extrabold text-brand">
                        {customer.name.charAt(0)}
                      </span>
                      <div>
                        <div className="font-display text-base font-bold">{customer.name}</div>
                        <div className="flex items-center gap-1.5 text-xs text-white/40">
                          {customer.phone ? (<><Phone size={11} /> {customer.phone}</>) : "No phone on the pages"}
                          <span>·</span> last entry {timeAgo(customer.last_entry)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-xl font-semibold text-brand">{rupee(customer.outstanding)}</div>
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 font-mono text-[10px] ${BAND[risk.band].chip}`}>
                        {BAND[risk.band].label} · {risk.score}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-white/8 pt-3">
                    {risk.components.map((c) => (
                      <span key={c.label} className="rounded-lg bg-white/5 px-2.5 py-1 text-[11px] text-white/55">
                        {c.detail} <span className="font-mono text-white/35">+{c.points}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "customers" && (
          <>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">Customers</h1>
            <p className="mt-1 text-sm text-white/50">
              {DEMO_CUSTOMERS.length} in the ledger · {DEMO_CUSTOMERS.filter((c) => c.outstanding > 0).length} with a balance
            </p>
            <ul className="mt-5 space-y-3">
              {DEMO_CUSTOMERS.map((c) => {
                const r = assessRisk(c);
                return (
                  <li key={c.id} className="glass flex items-center justify-between gap-4 rounded-2xl p-4 transition hover:brightness-125">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/15 font-display text-lg font-extrabold text-brand">
                        {c.name.charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-display text-base font-bold">{c.name}</div>
                        <div className="text-xs text-white/40">
                          {c.entry_count} entries · repaid {Math.round((c.paid / Math.max(1, c.credit)) * 100)}%
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono text-lg font-semibold ${c.outstanding > 0 ? "text-brand" : "text-good"}`}>
                        {rupee(c.outstanding)}
                      </div>
                      <div className="mt-1 flex items-center justify-end gap-1.5">
                        {(() => { const tr = customerTrust(c); const col = tr.band === "trusted" ? "#22C55E" : tr.band === "reliable" ? "#84CC16" : tr.band === "watch" ? "#F59E0B" : "#EF4444"; return (
                          <span className="rounded-full px-2 py-0.5 font-mono text-[10px]" style={{ background: col + "22", color: col }}>
                            trust {tr.score}
                          </span>
                        ); })()}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {tab === "ask" && <div data-tour="ask"><AskDemo /></div>}
      </main>

      <AssistantDock mode="demo" canned={DEMO_ANSWERS} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
function Card({ label, value, tone }: { label: string; value: string; tone?: "brand" | "good" }) {
  const c = tone === "brand" ? "text-brand" : tone === "good" ? "text-good" : "text-white";
  return (
    <div className="glass rounded-2xl p-4">
      <div className="font-mono text-[10px] tracking-widest text-white/40">{label.toUpperCase()}</div>
      <div className={`mt-1.5 font-mono text-xl font-semibold sm:text-2xl ${c}`}>{value}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
function ReviewDemo() {
  const [rows, setRows] = useState(DEMO_REVIEW);
  const [saved, setSaved] = useState(false);

  const flagged = rows.reduce(
    (n, r) => n + Object.values(r.fields).filter((f) => f.confidence < 0.75).length, 0
  );

  function edit(ri: number, key: string, value: string) {
    setRows((rs) =>
      rs.map((r, i) =>
        i === ri
          ? { ...r, fields: { ...r.fields, [key]: { ...r.fields[key], value, confidence: 1, reasons: [] } } }
          : r
      )
    );
  }

  if (saved) {
    return (
      <div className="glass rounded-3xl p-12 text-center">
        <Check size={32} className="mx-auto mb-4 text-good" />
        <h2 className="font-display text-2xl font-extrabold">Four entries added</h2>
        <p className="mx-auto mt-2 max-w-sm text-white/55">
          In the real app these are now in the ledger, balances are updated, and the page image is
          kept so you can check it later.
        </p>
        <button onClick={() => { setRows(DEMO_REVIEW); setSaved(false); }}
          className="mt-6 cursor-pointer rounded-xl bg-brand px-5 py-2.5 font-semibold text-navy transition hover:bg-brand-light">
          Run it again
        </button>
      </div>
    );
  }

  return (
    <>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Confirm before saving</h1>
      <p className="mt-1.5 text-sm text-white/50">
        4 rows read · Hindi + Telugu + English ·{" "}
        {flagged > 0
          ? <span className="text-brand">{flagged} field{flagged === 1 ? "" : "s"} need a look</span>
          : <span className="text-good">nothing flagged</span>}
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="glass rounded-2xl p-3 lg:sticky lg:top-28 lg:self-start">
          <div className="mb-2 px-1 font-mono text-[11px] tracking-widest text-white/40">THE PAGE</div>
          <PaperPage />
        </div>

        <div className="space-y-4">
          {rows.map((row, ri) => (
            <div key={row.label} className="glass rounded-2xl p-4">
              <div className="mb-3 font-mono text-[11px] tracking-widest text-white/40">{row.label}</div>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(row.fields).map(([key, f]) => {
                  const low = f.confidence < 0.75;
                  const wide = key === "items";
                  return (
                    <div key={key} className={wide ? "col-span-2" : ""}>
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <label className={`font-mono text-[10px] tracking-widest ${low ? "text-brand" : "text-white/40"}`}>
                          {key.replace("_", " ").toUpperCase()}
                        </label>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] ${
                          low ? "bg-brand/15 text-brand" : "bg-good/12 text-good"}`}>
                          {low && <AlertTriangle size={9} />}{Math.round(f.confidence * 100)}%
                        </span>
                      </div>
                      <input
                        value={f.value}
                        onChange={(e) => edit(ri, key, e.target.value)}
                        className={`w-full rounded-lg px-3 py-2.5 text-sm outline-none transition focus:border-brand/70 ${
                          low ? "field-flag border" : "border border-white/10 bg-white/5"}`}
                      />
                      {f.reasons?.length ? (
                        <p className="mt-1.5 text-[11px] leading-relaxed text-brand/80">{f.reasons.join(" · ")}</p>
                      ) : f.corroborations?.length ? (
                        <p className="mt-1.5 text-[11px] leading-relaxed text-good/60">{f.corroborations.join(" · ")}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <button onClick={() => setSaved(true)}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-good px-5 py-3.5 font-semibold text-[#04210F] transition hover:brightness-110 active:scale-[0.98]">
            <Check size={16} /> Save to ledger
          </button>
        </div>
      </div>
    </>
  );
}

/** A drawn notebook page — the demo has no real photo to show. */
function PaperPage() {
  const lines = [
    ["20/7", "Ramesh Yadav", "atta 5kg, chai", "620"],
    ["22/7", "Lakshmi Devi", "\u0924\u0947\u0932 1L, \u0936\u0915\u094D\u0915\u0930", "\u0969\u096A\u0966"],
    ["15/7", "Suresh Reddy", "\u0C2C\u0C3F\u0C2F\u0C4D\u0C2F\u0C02 25kg", "1?50"],
    ["3/7", "Anjali Gupta", "sabun, tel", "480"],
  ];
  return (
    <div className="overflow-hidden rounded-xl p-5" style={{
      background: "linear-gradient(#fdf6e3, #f5ead0)",
      backgroundImage: "repeating-linear-gradient(180deg, transparent 0 33px, rgba(30,58,95,0.13) 33px 34px)",
    }}>
      <div className="mb-4 border-b-2 pb-2 text-center font-bold" style={{ color: "#1e3a5f", borderColor: "rgba(30,58,95,0.3)" }}>
        उधार खाता
      </div>
      {lines.map((l, i) => (
        <div key={i} className="flex items-baseline gap-2 py-1.5 text-sm" style={{ color: "#1e3a5f", fontFamily: "Segoe Script, Bradley Hand, cursive" }}>
          <span className="w-10 shrink-0 opacity-70">{l[0]}</span>
          <span className="flex-1 truncate">{l[1]}</span>
          <span className="hidden flex-1 truncate opacity-75 sm:block">{l[2]}</span>
          <span className={`w-14 shrink-0 text-right font-semibold ${i === 2 ? "rounded px-1" : ""}`}
            style={i === 2 ? { background: "rgba(245,158,11,0.35)", outline: "2px solid #F59E0B" } : undefined}>
            {l[3]}
          </span>
        </div>
      ))}
      <p className="mt-4 border-t pt-2 text-[10px]" style={{ color: "#1e3a5f99", borderColor: "rgba(30,58,95,0.2)" }}>
        The highlighted amount is the one the reader flagged.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
function AskDemo() {
  const [turns, setTurns] = useState<{ role: "you" | "app"; text: string }[]>([]);
  const [thinking, setThinking] = useState(false);

  function ask(q: string, a: string) {
    setTurns((t) => [...t, { role: "you", text: q }]);
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      setTurns((t) => [...t, { role: "app", text: a }]);
    }, 700);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Ask your ledger</h1>
      <p className="mt-2 text-white/55">
        Answered from the sample shop&apos;s own entries. If the data doesn&apos;t contain the answer,
        it says so rather than inventing a figure.
      </p>

      <div className="mt-6 space-y-4">
        {turns.map((t, i) => (
          <div key={i} className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            t.role === "you" ? "ml-auto max-w-[85%] bg-brand font-medium text-navy" : "glass max-w-[92%]"}`}>
            {t.text}
          </div>
        ))}
        {thinking && (
          <div className="glass flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-white/50">
            <Sparkles size={15} className="animate-pulse text-brand" /> Reading the ledger
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {DEMO_ANSWERS.map((d) => (
          <button key={d.q} onClick={() => ask(d.q, d.a)}
            className="cursor-pointer rounded-lg border border-white/12 bg-white/5 px-3 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white">
            {d.q}
          </button>
        ))}
      </div>
    </div>
  );
}
