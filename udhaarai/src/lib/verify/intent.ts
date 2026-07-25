/**
 * AI Action Note — intent parser.
 *
 * The shopkeeper types (or speaks) a sentence in English, Hindi or Telugu.
 * This turns it into a structured action the app can confirm and execute.
 *
 * Why a deterministic parser and not "just ask Gemini"?
 *
 *   1. It runs instantly, offline, and free — no round trip for "Ramesh paid
 *      500", which is the single most common note.
 *   2. It is testable. An action that moves money must behave the same way
 *      every time, and a model's phrasing drifts.
 *   3. It degrades honestly. When the rules don't recognise a sentence with
 *      confidence, we hand off to the model rather than guessing — so the
 *      floor is "as good as the LLM", and the common cases are better.
 *
 * The parser extracts intent + slots + a confidence. The route decides
 * whether to confirm, ask a follow-up, or fall back to Gemini.
 */

import { normaliseDigits } from "./numerals";

export type ActionKind =
  | "record_payment"
  | "add_customer"
  | "record_expense"
  | "find_customer"
  | "generate_reminder"
  | "show_report"
  | "unknown";

export type Lang = "en" | "hi" | "te";

export type ParsedIntent = {
  kind: ActionKind;
  lang: Lang;
  confidence: number;
  slots: {
    customerName?: string;
    amount?: number;
    method?: string;
    category?: string;
    query?: string;
    report?: string;
  };
  /** Which slots are required for this action but weren't found. */
  missing: string[];
  /** The original text, kept for the fallback path. */
  raw: string;
};

/* ------------------------------------------------------------------ */
/*  Language detection by script block                                 */
/* ------------------------------------------------------------------ */
export function detectLang(text: string): Lang {
  if (/[\u0C00-\u0C7F]/.test(text)) return "te"; // Telugu block
  if (/[\u0900-\u097F]/.test(text)) return "hi"; // Devanagari block
  return "en";
}

/* ------------------------------------------------------------------ */
/*  Amount extraction — rupee sign, words, Indic digits                */
/* ------------------------------------------------------------------ */
function extractAmount(text: string): number | undefined {
  const t = normaliseDigits(text);
  // ₹500 / Rs 500 / 500 rupees / 2,300 / 1.5k
  const m = t.match(/(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(k|hazaar|हज़ार|వేల)?/i);
  if (!m) return undefined;
  let n = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(n)) return undefined;
  if (m[2]) n *= 1000; // "1.5k", "2 hazaar"
  return n > 0 ? Math.round(n * 100) / 100 : undefined;
}

/* ------------------------------------------------------------------ */
/*  Payment method                                                     */
/* ------------------------------------------------------------------ */
function extractMethod(text: string): string | undefined {
  const t = text.toLowerCase();
  if (/\bupi\b|phonepe|gpay|google pay|paytm|फ़ोनपे|यूपीआई/.test(t)) return "UPI";
  if (/credit card/.test(t)) return "Credit Card";
  if (/debit card/.test(t)) return "Debit Card";
  if (/bank|neft|imps|transfer|खाते|బ్యాంక్/.test(t)) return "Bank Transfer";
  if (/cheque|check/.test(t)) return "Cheque";
  if (/cash|नकद|नगद|క్యాష్|నగదు/.test(t)) return "Cash";
  return undefined;
}

/* ------------------------------------------------------------------ */
/*  Expense category                                                   */
/* ------------------------------------------------------------------ */
const CATEGORY_WORDS: Record<string, RegExp> = {
  Electricity: /electric|current|bijli|बिजली|కరెంట్|విద్యుత్/i,
  Rent: /rent|kiraya|किराया|అద్దె/i,
  Water: /water|paani|पानी|నీళ్ళ|నీటి/i,
  Internet: /internet|wifi|broadband|इंटरनेट|ఇంటర్నెట్/i,
  Salary: /salary|wage|tankha|तनख्वाह|జీతం|వేతనం/i,
  Inventory: /stock|inventory|maal|माल|సరుకు|స్టాక్/i,
  Transport: /transport|delivery|petrol|diesel|भाड़ा|రవాణా/i,
  Maintenance: /repair|maintenance|मरम्मत|మరమ్మతు/i,
  Groceries: /grocery|groceries|किराना|కిరాణా/i,
};
function extractCategory(text: string): string | undefined {
  for (const [cat, re] of Object.entries(CATEGORY_WORDS)) {
    if (re.test(text)) return cat;
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/*  Verb signals per language                                          */
/* ------------------------------------------------------------------ */
const SIGNALS = {
  paid: /\bpaid\b|\bpay\b|\bgave\b|\breceived\b|\bcleared\b|दिए|दिया|चुकाया|భరించ|చెల్లించ|కట్ట/i,
  add_customer: /\badd\b.*\b(customer|client)\b|new customer|customer.*\badd\b|ग्राहक.*जोड़|नया ग्राहक|కస్టమర్.*జోడించ|కొత్త కస్టమర్/i,
  expense: /\b(bill|expense|spent|paid for|cost)\b|खर्च|बिल|ఖర్చు|బిల్లు/i,
  find: /\b(find|search|show me|look up|where is)\b|ढूंढ|खोज|దొరుకు|వెతుకు|చూపించు.*కస్టమర్/i,
  reminder: /\bremind(er)?s?\b|\bfollow.?up\b|\bmessage\b|याद दिला|రిమైండర్|గుర్తు/i,
  report: /\b(profit|report|how much|revenue|summary|total|outstanding|owe)\b|मुनाफा|कितना|లాభం|ఎంత|నివేదిక/i,
};

/* ------------------------------------------------------------------ */
/*  Name extraction — pull a proper-noun-ish token near the verb        */
/* ------------------------------------------------------------------ */
const STOP = new Set([
  "paid", "pay", "gave", "received", "add", "customer", "client", "new",
  "rupees", "rs", "today", "yesterday", "the", "a", "an", "for", "of", "to",
  "bill", "expense", "spent", "find", "search", "show", "me", "record",
  "generate", "reminder", "cash", "upi", "and", "via", "by", "on",
]);

function extractName(text: string, lang: Lang): string | undefined {
  // Latin capitalised tokens (English): "Ramesh", "Suresh Kumar"
  if (lang === "en") {
    const caps = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g);
    if (caps) {
      const filtered = caps.filter((c) => !STOP.has(c.toLowerCase()));
      if (filtered.length) return filtered[0];
    }
    // "customer called suresh" / "add suresh"
    const m = text.match(/(?:called|named|customer)\s+([a-z]+)/i);
    if (m && !STOP.has(m[1].toLowerCase())) {
      return m[1].charAt(0).toUpperCase() + m[1].slice(1);
    }
  }
  // Indic scripts: grab the token before the payment verb
  const indic = text.match(/([\u0900-\u097F\u0C00-\u0C7F]{2,})/g);
  if (indic && indic.length) {
    // crude but effective: first Indic word is usually the name
    return indic[0];
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/*  Main parser                                                        */
/* ------------------------------------------------------------------ */
export function parseIntent(input: string): ParsedIntent {
  const raw = (input ?? "").trim();
  const lang = detectLang(raw);
  const base: ParsedIntent = {
    kind: "unknown", lang, confidence: 0, slots: {}, missing: [], raw,
  };
  if (!raw) return base;

  const amount = extractAmount(raw);
  const method = extractMethod(raw);
  const category = extractCategory(raw);
  const name = extractName(raw, lang);

  // -------- add customer (before payment; no amount expected) --------
  if (SIGNALS.add_customer.test(raw)) {
    return {
      ...base, kind: "add_customer",
      confidence: name ? 0.88 : 0.55,
      slots: { customerName: name },
      missing: name ? [] : ["customerName"],
    };
  }

  // -------- reminder (before payment: "...who hasn't paid" contains "paid") --------
  if (SIGNALS.reminder.test(raw)) {
    return {
      ...base, kind: "generate_reminder",
      confidence: 0.8,
      slots: { customerName: name, query: raw },
      missing: [],
    };
  }

  // -------- expense (before payment: "paid rent", "electricity bill") --------
  // An expense category present, OR expense wording without a person's name,
  // means this is money going OUT, not a customer paying in.
  if (SIGNALS.expense.test(raw) || (category && !name)) {
    const missing: string[] = [];
    if (!amount) missing.push("amount");
    return {
      ...base, kind: "record_expense",
      confidence: category && amount ? 0.9 : amount ? 0.7 : 0.5,
      slots: { amount, category: category ?? "Miscellaneous", method },
      missing,
    };
  }

  // -------- payment --------
  if (SIGNALS.paid.test(raw) && (amount || name)) {
    const missing: string[] = [];
    if (!name) missing.push("customerName");
    if (!amount) missing.push("amount");
    return {
      ...base, kind: "record_payment",
      confidence: name && amount ? 0.92 : 0.6,
      slots: { customerName: name, amount, method: method ?? undefined },
      missing,
    };
  }

  // -------- report / question --------
  if (SIGNALS.report.test(raw)) {
    return {
      ...base, kind: "show_report",
      confidence: 0.75,
      slots: { report: raw, query: raw },
      missing: [],
    };
  }

  // -------- find customer --------
  if (SIGNALS.find.test(raw)) {
    return {
      ...base, kind: "find_customer",
      confidence: name ? 0.85 : 0.6,
      slots: { query: name ?? raw.replace(SIGNALS.find, "").trim(), customerName: name },
      missing: [],
    };
  }

  // Nothing matched with confidence — the route will hand this to Gemini.
  return base;
}

/* ------------------------------------------------------------------ */
/*  Human summary of what was understood, for the confirmation card    */
/* ------------------------------------------------------------------ */
export function describeIntent(p: ParsedIntent): string {
  const { slots } = p;
  const rupee = (n?: number) => (n ? `\u20B9${n.toLocaleString("en-IN")}` : "an amount");
  switch (p.kind) {
    case "record_payment":
      return `Record a payment of ${rupee(slots.amount)} from ${slots.customerName ?? "a customer"}${slots.method ? ` via ${slots.method}` : ""}.`;
    case "record_expense":
      return `Record a ${slots.category ?? ""} expense of ${rupee(slots.amount)}.`;
    case "add_customer":
      return `Add a new customer${slots.customerName ? ` called ${slots.customerName}` : ""}.`;
    case "find_customer":
      return `Find the customer ${slots.customerName ?? slots.query ?? ""}.`;
    case "generate_reminder":
      return `Draft a payment reminder${slots.customerName ? ` for ${slots.customerName}` : ""}.`;
    case "show_report":
      return `Answer a question about your ledger.`;
    default:
      return `I'm not sure what you'd like to do.`;
  }
}
