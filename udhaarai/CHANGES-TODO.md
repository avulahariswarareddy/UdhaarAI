# What to change on your computer

Read this top to bottom. Some of these I already fixed in the code; some only
you can do because the files live on your machine. Each section says which.

---

## 1. Gemini model: 2.0 → 2.5  (DO THIS FIRST — it's your scanning fix)

Your Kirana project works because it uses `gemini-2.5-flash`. This project used
`gemini-2.0-flash`, which had `limit: 0` on your key. Switching fixes it.

**Edit one file.** Open `src/lib/gemini.ts`. Near the top find:

```
function model(name = "gemini-2.0-flash") {
```

Change it to:

```
function model(name = "gemini-2.5-flash") {
```

Save. Then test locally:

```powershell
npm run dev
```

Upload a notebook photo at http://localhost:3000/dashboard/upload — it should
read now.

Then push it live:

```powershell
git add .
git commit -m "Use gemini-2.5-flash"
git push
```

Vercel redeploys automatically on push. Wait for it to finish, then test the
live site.

---

## 2. "Change Claude to Opus 4.8" — there is nothing to change

Your app does not use Claude. It uses **Gemini** for scanning, reminders and the
assistant. There is no Claude model running in your project or your terminal, so
there is nothing to switch to Opus 4.8. If you saw that name somewhere, it is
unrelated to this app — send a screenshot and I'll explain what it is.

---

## 3. AI chat scroll bug — ALREADY FIXED in the code

The bug where clicking the chat button scrolled the page to the bottom is fixed
in `src/components/AssistantDock.tsx`. The chat now opens where you are and never
moves the page. You don't need to do anything except pull the latest code (it's
in the zip I gave you). If you're editing your own copy, the change is: the
message-list scroll now sets `scrollTop` on the panel's own container only, and
skips running when the panel is empty.

---

## 4. The logo — you have to add the file, I can't

I cannot put your logo file into your project from here. You do this:

1. Save your official logo as `logo.png` (or `.jpg`) into the folder
   `public/brand/` in your project, replacing what's there.
2. For the favicon and social preview, you also need these sizes in `public/`:
   `favicon.png` (32x32), `apple-icon.png` (180x180), `icon-192.png`,
   `icon-512.png`, `og.jpg` (1200x630).
   Easiest way: go to https://realfavicongenerator.net, upload your logo, download
   the pack, and drop the files into `public/`.
3. The code already points at these paths, so once the files are there with the
   right names, they appear automatically. No code change needed.

**Tell me the exact filename and size of your logo** and I'll tell you precisely
which files to rename and where, so nothing renders blurry.

---

## 5. The splash animation — I need to see it first

You said the splash HTML is already in the project, but I can't see your files
from here, so I can't wire it in blind — guessing would risk breaking the app.

To add a splash that plays once per session without a flash, I need to know:

1. **Where is your splash file?** What's it called and which folder is it in?
2. **Is it one self-contained HTML file, or separate HTML + CSS + JS?**
3. **How long does the animation run** before it should hand over to the homepage?

Paste the contents of your splash file into the chat (or tell me the path and
I'll tell you how to share it). Once I can see it, I'll write the exact code to:
- play it first, once per session (using sessionStorage)
- fade smoothly into the homepage with no white/black flash
- lock scrolling while it plays
- unmount it cleanly afterward

Without seeing the file, anything I write is a guess. Send it and I'll do it
properly.

---

## Priority order

1. **Model 2.0 → 2.5** — this makes scanning work. Do it now.
2. Push and confirm the live site scans a photo.
3. Logo files — tell me your filename, I'll guide the rest.
4. Splash — paste me the file, I'll wire it in.

Your `/demo` link already works with zero API calls, so your submission is safe
while you work through these.
