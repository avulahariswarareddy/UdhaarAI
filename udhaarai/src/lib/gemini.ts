import { GoogleGenerativeAI, SchemaType, type GenerativeModel } from "@google/generative-ai";
import { serverEnv } from "@/lib/env";
import { salvageJson } from "@/lib/verify/model-output";

/**
 * SERVER ONLY. The Gemini key never reaches the browser — every call in
 * this file runs inside a Next.js route handler.
 */
function model(name: string) {
  const genAI = new GoogleGenerativeAI(serverEnv().geminiKey);
  return genAI.getGenerativeModel({ model: name });
}

/**
 * Every call walks this chain, moving to the next model only when Google
 * rejects one over quota (free-tier buckets are per model per day) or
 * because the key's project can't use it — Google retired the 2.x family
 * for newly-created projects, where those names 404 with "no longer
 * available to new users". Led by gemini-flash-latest, Google's rolling
 * alias for the current flash model, so the chain keeps working across
 * future generation changes; explicit current-generation names back it
 * up, and the legacy 2.5 names stay at the tail for keys on older
 * projects that can still call them.
 */
const MODEL_CHAIN = [
  "gemini-flash-latest",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

async function withModelFallback<T>(run: (m: GenerativeModel) => Promise<T>): Promise<T> {
  let lastErr: unknown = null;
  for (const name of MODEL_CHAIN) {
    try {
      return await run(model(name));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const recoverable = isGeminiQuotaError(e) || /404|not.?found|is not supported/i.test(msg);
      if (!recoverable) throw e;
      console.warn(`[gemini] ${name} unavailable — trying next model:`, msg.slice(0, 120));
      lastErr = e;
    }
  }
  throw lastErr;
}

/**
 * True when a caught error is Gemini refusing the request over quota/rate
 * limits (a 429), as opposed to a genuine failure. Every route that calls
 * this file should check this before choosing what to tell the user —
 * "try again in a minute" is a very different message from "something's
 * broken", and the raw SDK error text should never reach the client either
 * way (it's a verbose multi-paragraph blob with links, not something to
 * show a shopkeeper).
 */
export function isGeminiQuotaError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /429|quota|rate.?limit/i.test(msg);
}

/* ------------------------------------------------------------------ */
/*  Structured output schema — forces valid JSON back from Gemini      */
/* ------------------------------------------------------------------ */
const field = (type: SchemaType) => ({
  type: SchemaType.OBJECT,
  properties: {
    value: { type },
    confidence: { type: SchemaType.NUMBER },
  },
  required: ["value", "confidence"],
});

const LEDGER_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    page_language: { type: SchemaType.STRING },
    page_quality: { type: SchemaType.STRING },
    entries: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          customer_name: field(SchemaType.STRING),
          phone: field(SchemaType.STRING),
          date: field(SchemaType.STRING),
          items: field(SchemaType.STRING),
          credit: field(SchemaType.NUMBER),
          payment: field(SchemaType.NUMBER),
          notes: field(SchemaType.STRING),
        },
        required: ["customer_name", "phone", "date", "items", "credit", "payment", "notes"],
      },
    },
  },
  required: ["page_language", "page_quality", "entries"],
} as const;

const EXTRACT_INSTRUCTIONS = `You are reading a photograph of a handwritten Indian kirana shop credit ledger — an "udhaar" notebook. The writing may be Hindi in Devanagari script, Telugu script, English, or several mixed on one page. Pages are often old: faded ink, uneven columns, corrections struck through, amounts written in the margin.

Read every ledger row visible on the page. For each row extract:
- customer_name: the person the row belongs to. If a name heads a block of rows, apply it to every row in that block.
- phone: only if a phone number is actually written. Indian mobile numbers are 10 digits.
- date: copy exactly as written. Do NOT reformat it and do NOT invent a year that is not on the page.
- items: goods written for that row, e.g. "rice 5kg, oil 1L". Keep the original language.
- credit: amount given on credit (naam / जमा नहीं / ఇచ్చిన). A plain number.
- payment: amount the customer paid back (jama / जमा / చెల్లించిన). A plain number.
- notes: anything else written on the row.

Confidence rules — these matter more than the reading itself:
- confidence is 0 to 1 for that ONE field, describing how sure you are.
- If a field is simply not written on the page, return an empty string (or 0) with confidence 1. Absence is certain.
- If a field IS written but you cannot read it cleanly, give your single best reading with a LOW confidence, under 0.6. A flagged wrong guess is useful; a confident wrong guess destroys the shopkeeper's trust.
- Never round an amount to look tidy. If it might be 450 or 456, return one of them at low confidence.
- Digits that are struck through or corrected: read the correction, not the original, and lower confidence.

page_quality: one short phrase, e.g. "clear", "faded ink", "blurry, retake suggested".
page_language: e.g. "Hindi", "Telugu", "Hindi + English".

Return every row you can see. If the photo shows no ledger rows at all, return an empty entries array.`;

export type Cell<T> = { value: T; confidence: number };
export type ExtractedRow = {
  customer_name: Cell<string>;
  phone: Cell<string>;
  date: Cell<string>;
  items: Cell<string>;
  credit: Cell<number>;
  payment: Cell<number>;
  notes: Cell<string>;
};
export type ExtractionResult = {
  page_language: string;
  page_quality: string;
  entries: ExtractedRow[];
};

/** Read a notebook page. Throws a user-safe Error on failure. */
export async function extractLedger(
  base64: string,
  mimeType: string
): Promise<ExtractionResult> {
  const result = await withModelFallback((m) => m.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { data: base64, mimeType } },
          { text: EXTRACT_INSTRUCTIONS },
        ],
      },
    ],
    // No maxOutputTokens: current-generation models spend output budget on
    // internal reasoning before emitting the JSON, so a tight cap gets
    // consumed before any answer appears. The schema keeps output bounded.
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: LEDGER_SCHEMA as never,
    },
  }));

  const text = result.response.text();

  // The model is instructed to return bare JSON and is given a schema, but
  // a schema is a strong hint rather than a hard contract. salvageJson
  // handles fences, prose wrappers, smart quotes, trailing commas and
  // token-limit truncation, so a well-read page is not thrown away over
  // formatting. Raw model text never reaches the user either way.
  const salvaged = salvageJson<ExtractionResult>(text);
  if (!salvaged.ok) {
    console.error("[gemini] unparseable response", { reason: salvaged.reason, head: text.slice(0, 200) });
    throw new Error("The page could not be read cleanly. Try a straighter, better-lit photo.");
  }
  if (salvaged.strategy !== "direct") {
    console.warn(`[gemini] response needed salvage: ${salvaged.strategy}`);
  }
  const parsed: ExtractionResult = salvaged.value;

  // Never trust the model's shape blindly, even with a schema.
  parsed.entries = (parsed.entries ?? []).map((row) => {
    const clamp = (c: unknown) => {
      const n = Number(c);
      return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.4;
    };
    const keys = ["customer_name", "phone", "date", "items", "credit", "payment", "notes"] as const;
    const out = {} as ExtractedRow;
    for (const k of keys) {
      const cell = (row as never as Record<string, Cell<unknown>>)[k] ?? { value: "", confidence: 0.4 };
      (out as never as Record<string, Cell<unknown>>)[k] = {
        value: cell.value ?? (k === "credit" || k === "payment" ? 0 : ""),
        confidence: clamp(cell.confidence),
      };
    }
    return out;
  });

  return parsed;
}

/* ------------------------------------------------------------------ */
/*  Reminder writer                                                    */
/* ------------------------------------------------------------------ */
export type ReminderVariant = { label: string; body: string };

const REMINDER_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    variants: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          label: { type: SchemaType.STRING },
          body: { type: SchemaType.STRING },
        },
        required: ["label", "body"],
      },
    },
  },
  required: ["variants"],
} as const;

/**
 * Write three personalised reminders for ONE customer.
 *
 * The brief is built from that customer's real ledger — last payment amount
 * and date, how long they have been a customer, what they recently bought,
 * any note the shopkeeper wrote. The model is told explicitly that it may
 * only use those facts, and that a placeholder is a failure. The caller
 * validates every variant before showing it, so nothing generic reaches a
 * real customer's phone.
 */
export async function writeReminderVariants(opts: {
  brief: string;
  language: "en" | "hi" | "te";
  tone: string;
  toneReason: string;
}): Promise<ReminderVariant[]> {
  const langName = {
    en: "English",
    hi: "Hindi, in Devanagari script",
    te: "Telugu, in Telugu script",
  }[opts.language];

  const toneNote: Record<string, string> = {
    appreciative: "Warm and grateful. Thank them for being a long-standing customer BEFORE mentioning the balance.",
    friendly: "Warm and casual, the way a neighbour speaks to a regular.",
    gentle: "Soft and understanding. They have slipped a little; do not make them feel accused.",
    professional: "Polite and businesslike. Clear about the amount, with no guilt and no warmth that would ring false.",
    festival: "Open with festival good wishes, then mention the balance gently at the end.",
  };

  const result = await withModelFallback((m) => m.generateContent({
    contents: [{
      role: "user",
      parts: [{
        text: `You are writing WhatsApp messages for a small Indian kirana (grocery) shop, asking a customer about money owed on credit.

Here are the ONLY facts you may use. Every one is real, from the shop's ledger:

${opts.brief}

Tone to use: ${toneNote[opts.tone] ?? toneNote.friendly}
(Chosen because: ${opts.toneReason})

Write THREE different messages in ${langName}:
1. "warm"     — personal and friendly, mentions something specific about this customer
2. "standard" — polite and clear, the safe everyday choice
3. "brief"    — two short sentences, for a customer who prefers no fuss

Absolute rules:
- Use the customer's actual name and the actual amounts above. NEVER write a placeholder like [Name], {amount}, or XXX. A placeholder is a total failure.
- Keep the customer's name and rupee figures in Latin script even when the message is in Hindi or Telugu — that is how shopkeepers actually write.
- Never threaten. No legal action, no public shaming, no cutting off supply, no deadline you were not given.
- Do not invent a due date, an interest charge, or any fact not listed above.
- Each message under 45 words. At most one emoji, and only if it fits.
- Write the way a shopkeeper actually types on WhatsApp, not like a bank letter.

Return ONLY raw JSON, no markdown fence:
{"variants":[{"label":"warm","body":"..."},{"label":"standard","body":"..."},{"label":"brief","body":"..."}]}`,
      }],
    }],
    // No maxOutputTokens — see extractLedger; reasoning eats tight caps.
    generationConfig: {
      temperature: 0.85,
      responseMimeType: "application/json",
      responseSchema: REMINDER_SCHEMA as never,
    },
  }));

  const salvaged = salvageJson<{ variants: ReminderVariant[] }>(result.response.text());
  if (!salvaged.ok || !Array.isArray(salvaged.value?.variants)) {
    throw new Error("The reminder could not be written. Try again.");
  }
  return salvaged.value.variants
    .filter((v) => v && typeof v.body === "string")
    .map((v) => ({ label: String(v.label ?? "standard"), body: v.body.trim() }));
}

/* ------------------------------------------------------------------ */
/*  Ask-your-ledger assistant                                          */
/* ------------------------------------------------------------------ */
export async function answerAboutLedger(question: string, ledgerJson: string) {
  const result = await withModelFallback((m) => m.generateContent(
    `You are the assistant inside UdhaarAI, an app that digitizes a kirana shop's handwritten credit notebook.

Here is the shop's ledger data as JSON. This is the ONLY data you may use:
${ledgerJson}

The shopkeeper asks: "${question}"

Rules:
- Answer only from the JSON above. It contains customer balances, recent entries with how each was paid, business totals (collected, credit given, expenses, outstanding for this month and today), and recent expenses by category. Profit means collected minus expenses. If the data does not contain the answer, say so plainly and say what would be needed.
- Amounts in rupees, Indian number formatting.
- Be brief: two or three sentences, or a short list. No preamble.
- Never invent a customer, an amount, or a date.
- If asked to do something that is not a question about this ledger, say that is outside what you can help with here.`
  ));
  return result.response.text().trim();
}

/* ------------------------------------------------------------------ */
/*  Translate a short assistant line into Hindi or Telugu.            */
/*  Used when the shopkeeper asks to see a question in their language. */
/* ------------------------------------------------------------------ */
export async function translateLine(text: string, target: "hi" | "te"): Promise<string> {
  const langName = target === "hi" ? "Hindi (Devanagari script)" : "Telugu script";
  const result = await withModelFallback((m) => m.generateContent(
    `Translate this short message from an Indian shopkeeping app into ${langName}. Keep it natural and simple, the way a shopkeeper speaks. Keep rupee amounts and names as they are. Return ONLY the translation, nothing else.

Message: ${text}`
  ));
  return result.response.text().trim();
}
