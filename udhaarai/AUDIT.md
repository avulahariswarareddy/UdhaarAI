# Security & correctness audit

Run against the five-prompt checklist (Gitleaks, Bearer, ECC Production Audit, Trail of Bits, ECC Security Review), plus a correctness pass on the deterministic layer.

**82 automated tests, all passing.** `npm test` runs them; `npm run build` refuses to build if any fail.

---

## Findings fixed in this pass

| # | Severity | Finding | Fix |
|---|---|---|---|
| 1 | **High** | **CSV formula injection.** Customer names come from OCR of arbitrary pages. A name beginning `=`, `+`, `-`, `@`, tab or CR executes as a formula when the export is opened in Excel, LibreOffice or Sheets. | Cells matching `/^[=+\-@\t\r]/` are prefixed with `'`. 7 regression tests. |
| 2 | **High** | **Open redirect on login.** `?next=//evil.com` is a valid argument to `router.push`. A user completing sign-in would be sent offsite carrying a fresh session. | `next` must start with `/` and not `//`. Same guard already existed on `/auth/callback`; now on both. 4 tests. |
| 3 | **Medium** | **Schema drift — app would crash after deploy.** Code calls `record_payment()` and `customer_risk_input()`, and reads `uploads.page_hash`. None existed in the SQL. | `supabase/migration-002.sql`. An automated check now compares every `.rpc()` call against the SQL files. |
| 4 | **Medium** | **`unsafe-eval` in production CSP.** Only the dev-mode React refresh runtime needs it; leaving it on widens the blast radius of any XSS. | Dropped when `NODE_ENV === "production"`. |
| 5 | **Medium** | **No server-side length limits.** The client capped `business_name` and `customer.name`, but a client cap is a convenience, not a control — anything holding the anon key can POST directly. | `CHECK` constraints in migration 002. |
| 6 | **Low** | **Doubled-consonant names escaped fuzzy matching.** "Sureshh" and "Suresh" produced different phonetic keys, so they'd become two customers with a split balance. | Doubles collapsed before the digraph rules. Caught by a failing test, fixed in the module rather than by weakening the test. |
| 7 | **Low** | **Three features built but unreachable.** `/dashboard/collections` wasn't in the nav; `QuickPayment` was never mounted. Dead code that looks like a feature. | Both wired up. |

## Already correct (verified, not assumed)

- **RLS on all 7 tables**, every policy `auth.uid() = owner_id`. Verification query included in SETUP.md.
- **Storage bucket private**, path-scoped to `notebooks/<user-id>/`, served via 1-hour signed URLs.
- **Magic-byte sniffing** on upload — the declared MIME type is never trusted. HTML disguised as `.jpg` is rejected. 4 tests.
- **No IDOR** — route handlers re-check `owner_id` explicitly rather than trusting ids in the body. `record_payment` re-checks ownership *inside the database*, so it holds even if a handler is bypassed.
- **No secret is client-reachable.** `GEMINI_API_KEY` is imported only by `/api` routes. Nothing sensitive uses `NEXT_PUBLIC_`.
- **CSRF origin check** on mutating routes.
- **Errors return a correlation id**, never a stack trace or query detail.
- **`search_path` pinned** on every `SECURITY DEFINER` function.

## Known limitations — stated, not hidden

- **Rate limiting is in-memory.** On Vercel it resets per lambda cold start, so the real limit is looser than the configured one. Fine for single-admin; swap for Upstash Redis before multi-tenant.
- **No penetration test.** These are code-level controls. An app handling real money at scale needs a human review.
- **Duplicate detection compares against the last 200 uploads**, not all history. Beyond that, a re-upload from a year ago won't be caught.

---

## Test coverage

```
tests/verify.test.ts     49   numerals, name matching, phone, dates
tests/security.test.ts   19   CSV injection, open redirect, magic bytes, sanitisation
tests/risk.test.ts       14   risk ordering, ageing buckets, recovery outlook
```

The 49 in `verify` matter most for the demo: they prove the deterministic layer works on Devanagari and Telugu digits, `1,250` / `450/-` / `Rs 450` / `1.5k` amount formats, `+91` and leading-zero phone forms, day-first dates including `31 Feb` rejection, and that "Ramesh Yadhav" merges into "Ramesh Yadav" while "Suresh Yadav" does **not**.
