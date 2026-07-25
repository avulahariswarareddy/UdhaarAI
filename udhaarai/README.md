# UdhaarAI

**Snap. Understand. Collect.**

India has around 13 million kirana shops. Most of them run credit — *udhaar* — out of a paper notebook that nobody can search, back up, or total without doing it by hand. One flood, one fire, one lost notebook and the shop's receivables are gone.

UdhaarAI reads that notebook. Photograph a page and it extracts every row — customer, date, items, credit, payment — across Hindi, Telugu and English handwriting, then **shows you exactly which figures it isn't sure about** before anything reaches your ledger.

---

## The idea the whole product turns on

Handwriting recognition is never 100%. Most OCR products hide that and hand you a clean table full of quiet errors. In a credit ledger a quiet error is worse than no answer at all — it's a number a shopkeeper will act on and a customer will dispute.

So UdhaarAI scores **every field individually** from 0 to 1, and anything under 0.75 gets flagged amber on the review screen with the original photo beside it. The model is explicitly instructed:

> A flagged wrong guess is useful; a confident wrong guess destroys the shopkeeper's trust.

Confirming a flagged field sets its confidence to 1. Nothing uncertain is ever saved silently.

---

## What's built

| | |
|---|---|
| **Read a page** | Upload or camera → Gemini 2.0 Flash → structured JSON with per-field confidence |
| **Review screen** | Photo on the left with zoom and rotate, editable rows on the right, uncertain fields flagged |
| **Ledger** | Auto-built customers, running balances, per-customer transaction history |
| **Overview** | Outstanding, today's and this month's credit vs collection, 14-day trend chart, who owes most |
| **Ask your ledger** | Plain questions answered strictly from your own data — no invented figures |
| **Reminders** | Personalised per customer from their own ledger — last payment, tenure, purchases. Three variants, tone auto-chosen from their history, editable, WhatsApp deep link |
| **Export** | Full ledger to CSV, any time |

---

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind · Supabase (Postgres, Auth, Storage) · Gemini 2.0 Flash · Recharts · Vercel

Every service is on a free tier.

---

## Security

Built against the standard audit checklist rather than retrofitted:

- **Row Level Security on all 7 tables.** The anon key ships to the browser, so RLS is the only thing between one shop's ledger and another's. Every policy is `auth.uid() = owner_id`.
- **Private storage bucket.** Notebook photos live under `notebooks/<user-id>/`, enforced by a storage policy on the path's first segment. Served through one-hour signed URLs.
- **No secret is client-reachable.** The Gemini key is read only inside `/api` routes. Nothing sensitive uses a `NEXT_PUBLIC_` prefix.
- **No IDOR.** Route handlers re-check ownership with an explicit `owner_id` filter rather than trusting the id in the request body.
- **Input validated then sanitized.** Zod schemas on every JSON body; text is stripped and length-capped before it's stored; amounts are coerced and floored at zero.
- **Rate limits** on OCR (12/min), assistant (20/min) and reminders (15/min).
- **Errors don't leak.** Clients get a generic message plus a correlation id; the detail goes to the server log.
- **Security headers** — CSP, HSTS, `X-Frame-Options: DENY`, `nosniff` — set in `next.config.mjs`.
- **`search_path` pinned** on the `SECURITY DEFINER` trigger, closing the standard Postgres privilege-escalation hole.

---

## Running it

See **DEPLOY.md** — Supabase, the SQL migrations in order, both login methods, the Gemini key, and Vercel.

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev
npm test                     # 194 tests
npm run preflight            # pre-deploy config check
```

## New in this build

- **AI Action Note** (dashboard + demo): type or speak a sentence in English, Hindi or Telugu — "Ramesh paid 500 via UPI", "बिजली का खर्च 2300", "add customer Suresh". A deterministic parser (`src/lib/verify/intent.ts`, 30 tests) extracts the action; money movements always show a confirmation card with Yes / Edit / Cancel before anything is written. Low-confidence notes fall back to the ledger assistant. The confirmation question can be translated to Hindi or Telugu with a tap.
- **Guided demo tour**: the mascot walks a judge through five features with a spotlight overlay. Starts from a welcome screen; skippable at any point.
- **Voice input** uses the browser's built-in SpeechRecognition where available, and degrades gracefully with a clear message where it isn't.
- **Help & support** footer with the developer's email.

No new SQL — these reuse the existing `/api/payment`, `/api/expense` and `/api/customer` routes (all already audited) as executors.

## Intelligence features (this build)

All computed as explainable math over the ledger — `src/lib/verify/insights.ts`, 18 tests. No model involved, so each carries the reason it reached its number:

- **Business Health Score** — one 0-100 grade from collection ratio, margin, concentration and ageing. On the dashboard with its contributing factors.
- **Customer Trust Score** — per-customer 0-100 from repayment ratio, relationship length and payment recency. Badges on customer rows.
- **Smart Reminder Timing** — when each balance is most worth chasing.
- **AI Business Advisor** — proactive, ranked, plain-English advice ("Collect from Ravi this week…", "Expenses up 18%…"). Flagship section on the landing page and live on the dashboard.
- **Festival Intelligence** — flags the next major festival within three weeks so credit can be collected first.

The other items from the feature list (Fraud Detection, OCR Learning, OCR Replay, Dark Mode, Weekly AI Report) are **not built** — they're noted here so the gap is honest rather than mocked up.

---

## What's deliberately not here

Single-admin only. No staff accounts, no customer portal, no payment gateway, no WhatsApp Business API. The schema has `owner_id` on every table, so staff accounts are a policy change rather than a rewrite — but a first version that does one thing reliably beats one that does eight things unreliably.
