# Get it live in 20 minutes

You need a URL judges can open. This is the shortest path there.

Do these in order. Don't skip step 4 — it's the one that silently breaks logins.

---

## 0 · Run it locally first (3 min)

```bash
npm install
cp .env.example .env.local     # fill in after steps 1-2
npm run dev                    # http://localhost:3000
```

`/demo` works immediately with no keys at all. The rest needs steps 1 and 2.

---

## 1 · Supabase (7 min)

1. **supabase.com** → New project → region **Mumbai (ap-south-1)** → wait ~2 min.
2. **SQL Editor → New query.** Paste and **Run** each file, in this exact order:

   | # | File | What breaks if you skip it |
   |---|------|----------------------------|
   | 1 | `supabase/schema.sql` | Everything |
   | 2 | `supabase/storage.sql` | Uploads fail |
   | 3 | `supabase/migration-002.sql` | Collect page, payments |
   | 4 | `supabase/migration-003.sql` | **Login loops forever** |
   | 5 | `supabase/migration-004.sql` | Terms screen loops, receipts |
   | 6 | `supabase/migration-005.sql` | Expenses, profit, advisor |
   | 7 | `supabase/storage.sql` **again** | Expense bill images |

3. Verify — every row must say `true`:

```sql
select tablename, rowsecurity from pg_tables
where schemaname='public' order by tablename;
```

4. **Project Settings → API.** Copy the Project URL and the `anon` key.

---

## 2 · Gemini key (2 min)

**aistudio.google.com/apikey** → Create API key. Copy it.

Free tier: ~15 requests/min, 1,500/day. One notebook page is one request.

---

## 3 · Deploy (5 min)

```bash
npm install
npm run preflight     # catches missing config before you push
git init && git add . && git commit -m "UdhaarAI"
gh repo create udhaarai --public --source=. --push
```

Then **vercel.com → Add New → Project → Import**.

**Before clicking Deploy**, add these environment variables:

```
NEXT_PUBLIC_SUPABASE_URL      = your project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY = your anon key
GEMINI_API_KEY                = your Gemini key
NEXT_PUBLIC_SITE_URL          = https://your-app.vercel.app
```

`NEXT_PUBLIC_SITE_URL` is a chicken-and-egg — deploy once, copy the URL Vercel gives you, paste it in, redeploy.

---

## 4 · The step everyone forgets (4 min)

### Auth redirect URLs

**Supabase → Authentication → URL Configuration:**
- Site URL → `https://your-app.vercel.app`
- Redirect URLs → add `https://your-app.vercel.app/auth/callback`

**Without this, Google sign-in bounces users back to the login page forever.**

### The OTP email template

**Authentication → Email Templates → Magic Link.** Supabase's default sends a *link*. This app asks for a six-digit *code*. Replace the body with:

```html
<h2>Your UdhaarAI code</h2>
<p>Enter this code to open your ledger:</p>
<p style="font-size:28px;letter-spacing:6px"><strong>{{ .Token }}</strong></p>
<p>It expires in an hour. If you didn't ask for it, ignore this email.</p>
```

If `{{ .Token }}` isn't in there, **no code ever arrives** and email login appears broken.

### Rate limits

**Authentication → Rate Limits** — set emails/hour and token verifications/hour to **30**. The app limits sign-ins itself, but that limiter resets on serverless cold start; this is the durable backstop.

---

## 5 · Check it works (2 min)

Open your live URL and confirm:

- [ ] `/` loads, hero image animates, tab shows the UdhaarAI icon
- [ ] `/demo` works **without signing in** — this is what judges click first
- [ ] Email login delivers a 6-digit code
- [ ] Terms → onboarding → dashboard, no loops
- [ ] Upload a photo of a handwritten page → review screen shows confidence scores
- [ ] Record a payment → download the receipt PDF
- [ ] Paste your URL into WhatsApp — the preview card should show the logo

---

## What to give the judges

**The `/demo` link, not the root.** It needs no signup, loads in about a second, and puts them straight into a working ledger with the guided tour.

```
https://your-app.vercel.app/demo
```

---

## If something breaks

| Symptom | Cause |
|---|---|
| Login loops back to `/login` | Redirect URL missing in Supabase (step 4) |
| Terms page loops | `migration-004.sql` wasn't run |
| Onboarding loops | `migration-003.sql` wasn't run |
| Expenses / advisor 500s | `migration-005.sql` wasn't run |
| No OTP email | Template missing `{{ .Token }}` |
| Upload "could not be stored" | `storage.sql` wasn't run |
| "Missing environment variable" | Add it in Vercel, then **redeploy** — env changes need one |
