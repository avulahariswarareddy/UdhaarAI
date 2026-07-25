# Two-minute pitch

Plain sentences, meant to be said out loud. ~300 words ≈ 2:00 at a natural pace.

---

**[0:00 — the problem, from inside it]**

My family runs a kirana shop in Hyderabad. Like almost every kirana shop in India, we sell on credit — udhaar — and we track it in a paper notebook. Names down one side, amounts down the other, going back years.

There are around thirteen million shops like ours. Most work exactly this way.

That notebook can't be searched. It can't be totalled without doing it by hand. And if it's lost, so is every rupee owed to that shop.

**[0:30 — why the obvious fix fails]**

Apps exist for this. Khatabook, OkCredit — millions of users. But every one of them asks the shopkeeper to *stop writing and start typing*.

Picture the actual moment. A customer phones an order. My father is holding the phone in one hand and a pen in the other, writing while they talk. Three seconds, no signal needed, no login.

Now the app version: unlock, find app, wait, search customer, tap add, type amount, save — while somebody's still talking.

Paper wins. Not because shopkeepers are behind the times. Because for that moment, paper is genuinely faster.

**[1:00 — what I built]**

So UdhaarAI doesn't replace the notebook. It meets it at the end of the day.

You photograph the page. It reads every row — Hindi, Telugu, English, mixed on one page.

*[show the review screen]*

And here's the part that matters. It scores every single field on how confident it is. Anything it's unsure of turns amber and waits for you.

This amount — the ink is smudged. It's shown at 48%, not banked at 100%.

Because a confident wrong number in a credit ledger is worse than no number at all. That's a figure the shopkeeper acts on and the customer disputes.

**[1:40 — what it becomes]**

Once it's digital, everything follows. Who owes most. Who's gone quiet for sixty days. A reminder in Telugu. A receipt PDF with the shop's own logo.

The notebook stays. The arithmetic goes.

---

## Hitting the rubric

Read this before recording. Each criterion, and the single strongest thing to say.

**Problem & Impact** — Lead with "my family's shop." Lived problem beats researched problem every time. 13 million shops; most still on paper.

**Creativity & Originality** — The insight isn't OCR. It's *inverting the assumption*. Every competitor assumes the shopkeeper should adapt to the software. This adapts to the shopkeeper. Say plainly: "Khatabook and OkCredit are good products — but all of them start with typing. None of them start from the page you already wrote."

**Use of AI & Prompting** — This is where most entries are weakest, so be specific:
- Gemini reads the page, but is **checked, not trusted**. Deterministic code verifies every field — Indic numeral conversion, phone shape, date validity, arithmetic reconciliation. If Gemini claims 95% confidence on a nine-digit phone number, the structural check overrules it.
- The Action Note parser understands English, Hindi and Telugu **without a model call** — instant, offline, free. It only falls back to the LLM when it isn't confident.
- Everything the shopkeeper acts on — profit, health score, who to chase — is arithmetic with stated reasons, not a model guess.
- **194 automated tests.** The build refuses to compile if any fail.

**Product Execution** — Show the demo, don't describe it. `/demo` needs no signup. Row Level Security on every table, private storage, rate-limited auth, formula-injection-safe exports.

**Clarity of Pitch** — Don't say "AI-powered" or "leveraging." Say what happens.

**Potential** — The schema has `owner_id` on every table, so staff accounts are a policy change, not a rewrite. Next: WhatsApp Business API, supplier-side credit, and the correction data becoming a fine-tuning set.

---

## Recording notes

- **Get to the review screen by 1:00.** It's the only screen that makes the argument.
- Pre-upload one page so you're not waiting on the API mid-recording.
- Include a deliberately messy amount and let the amber flag speak.
- Give judges `/demo`, not `/`. No signup, straight into a working ledger.
- If asked "how is this different from ChatGPT reading a photo?" — the answer is the confidence layer and the ledger structure. ChatGPT gives you text. This gives you a customer with a running balance, and tells you what it wasn't sure about.
