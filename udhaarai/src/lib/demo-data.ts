/**
 * Seeded demo ledger. No database, no auth, no API keys.
 *
 * A judge opening the demo has about ninety seconds of patience. Every
 * number here is chosen so the derived screens tell a real story: someone
 * who has gone quiet for four months, someone who always pays, a page
 * mid-review with genuinely ambiguous handwriting.
 */
import type { CustomerRow } from "@/lib/verify/risk";

const day = 86400000;
const ago = (n: number) => new Date(Date.now() - n * day).toISOString();

export const DEMO_CUSTOMERS: CustomerRow[] = [
  {
    id: "d1", name: "Ramesh Yadav", phone: "9876543210",
    credit: 12400, paid: 3200, outstanding: 9200,
    last_entry: ago(4), last_payment: ago(131),
    entry_count: 18, first_entry: ago(420),
  },
  {
    id: "d2", name: "Lakshmi Devi", phone: "9812345678",
    credit: 8600, paid: 8100, outstanding: 500,
    last_entry: ago(2), last_payment: ago(2),
    entry_count: 31, first_entry: ago(380),
  },
  {
    id: "d3", name: "Suresh Reddy", phone: "9701234567",
    credit: 21000, paid: 6000, outstanding: 15000,
    last_entry: ago(9), last_payment: ago(74),
    entry_count: 22, first_entry: ago(300),
  },
  {
    id: "d4", name: "Anjali Gupta", phone: null,
    credit: 3400, paid: 0, outstanding: 3400,
    last_entry: ago(21), last_payment: null,
    entry_count: 5, first_entry: ago(60),
  },
  {
    id: "d5", name: "Mohammed Irfan", phone: "9640012345",
    credit: 15600, paid: 14900, outstanding: 700,
    last_entry: ago(1), last_payment: ago(1),
    entry_count: 44, first_entry: ago(500),
  },
  {
    id: "d6", name: "Padma Rao", phone: "9885511223",
    credit: 6800, paid: 1200, outstanding: 5600,
    last_entry: ago(38), last_payment: ago(190),
    entry_count: 11, first_entry: ago(240),
  },
  {
    id: "d7", name: "Venkat Naidu", phone: "9553311998",
    credit: 4200, paid: 4200, outstanding: 0,
    last_entry: ago(12), last_payment: ago(12),
    entry_count: 9, first_entry: ago(150),
  },
];

export type DemoTx = {
  id: string; customer: string; date: string;
  items: string; credit: number; payment: number;
};

export const DEMO_TRANSACTIONS: DemoTx[] = [
  { id: "t1", customer: "Mohammed Irfan", date: "23/07", items: "chawal 10kg, dal 2kg", credit: 0, payment: 1400 },
  { id: "t2", customer: "Lakshmi Devi", date: "22/07", items: "\u0924\u0947\u0932 1L, \u0936\u0915\u094D\u0915\u0930 2kg", credit: 340, payment: 0 },
  { id: "t3", customer: "Ramesh Yadav", date: "20/07", items: "atta 5kg, chai patti", credit: 620, payment: 0 },
  { id: "t4", customer: "Suresh Reddy", date: "15/07", items: "\u0C2C\u0C3F\u0C2F\u0C4D\u0C2F\u0C02 25kg", credit: 1850, payment: 0 },
  { id: "t5", customer: "Anjali Gupta", date: "03/07", items: "sabun, tel, masala", credit: 480, payment: 0 },
  { id: "t6", customer: "Padma Rao", date: "16/06", items: "dal 5kg, mirchi", credit: 720, payment: 0 },
];

/**
 * A page mid-review. The confidences are the point of the whole demo:
 * two fields are genuinely uncertain and the page says so instead of
 * guessing them at 95%.
 */
export type DemoField = {
  value: string;
  confidence: number;
  reasons?: string[];
  corroborations?: string[];
};

export const DEMO_REVIEW: { fields: Record<string, DemoField>; label: string }[] = [
  {
    label: "ROW 01",
    fields: {
      customer_name: { value: "Ramesh Yadav", confidence: 0.97, corroborations: ["Well-formed name", "Matches existing customer"] },
      date: { value: "20/07", confidence: 0.94, corroborations: ["Parses to a real calendar date"] },
      items: { value: "atta 5kg, chai patti", confidence: 0.88 },
      credit: { value: "620", confidence: 0.96, corroborations: ["Parses cleanly"] },
      payment: { value: "0", confidence: 1 },
    },
  },
  {
    label: "ROW 02",
    fields: {
      customer_name: { value: "Lakshmi Devi", confidence: 0.93, corroborations: ["Matches existing customer"] },
      date: { value: "22/07", confidence: 0.91, corroborations: ["Parses to a real calendar date"] },
      items: { value: "\u0924\u0947\u0932 1L, \u0936\u0915\u094D\u0915\u0930 2kg", confidence: 0.84 },
      credit: { value: "340", confidence: 0.9, corroborations: ["Converted Indic numerals to digits"] },
      payment: { value: "0", confidence: 1 },
    },
  },
  {
    label: "ROW 03",
    fields: {
      customer_name: { value: "Suresh Reddy", confidence: 0.89, corroborations: ["Matches existing customer"] },
      date: { value: "15/07", confidence: 0.92 },
      items: { value: "\u0C2C\u0C3F\u0C2F\u0C4D\u0C2F\u0C02 25kg", confidence: 0.81 },
      credit: { value: "1850", confidence: 0.48, reasons: ["Ink smudged across the third digit", "Could read as 1350"] },
      payment: { value: "0", confidence: 1 },
    },
  },
  {
    label: "ROW 04",
    fields: {
      customer_name: { value: "Anjali Gupta", confidence: 0.72, reasons: ["No close match in your customer list — may be new"] },
      date: { value: "03/07", confidence: 0.9 },
      items: { value: "sabun, tel, masala", confidence: 0.86 },
      credit: { value: "480", confidence: 0.93 },
      payment: { value: "0", confidence: 1 },
    },
  },
];

export const DEMO_TREND = [
  { day: "11 Jul", credit: 1200, payment: 800 },
  { day: "12 Jul", credit: 640, payment: 1500 },
  { day: "13 Jul", credit: 980, payment: 400 },
  { day: "14 Jul", credit: 1560, payment: 900 },
  { day: "15 Jul", credit: 1850, payment: 1200 },
  { day: "16 Jul", credit: 720, payment: 2100 },
  { day: "17 Jul", credit: 1100, payment: 600 },
  { day: "18 Jul", credit: 430, payment: 1800 },
  { day: "19 Jul", credit: 1340, payment: 700 },
  { day: "20 Jul", credit: 620, payment: 1450 },
  { day: "21 Jul", credit: 890, payment: 500 },
  { day: "22 Jul", credit: 340, payment: 1900 },
  { day: "23 Jul", credit: 1020, payment: 1400 },
  { day: "24 Jul", credit: 560, payment: 2200 },
];

/** Canned assistant answers — deterministic, computed from the demo ledger. */
export const DEMO_ANSWERS: { q: string; a: string }[] = [
  {
    q: "Who owes me the most?",
    a: "Suresh Reddy, at \u20B915,000 across 22 entries. He last paid 74 days ago. Ramesh Yadav is second at \u20B99,200, and he has not paid in 131 days \u2014 that one is older and worth chasing first.",
  },
  {
    q: "Who hasn't paid in sixty days?",
    a: "Four customers: Ramesh Yadav (131 days, \u20B99,200), Padma Rao (190 days, \u20B95,600), Suresh Reddy (74 days, \u20B915,000), and Anjali Gupta, who has never made a payment at all (\u20B93,400 over 5 entries).",
  },
  {
    q: "What did I collect this week?",
    a: "\u20B98,850 collected over the last seven days, against \u20B94,760 of new credit given. Net position improved by \u20B94,090.",
  },
  {
    q: "How much did I spend this month?",
    a: "\u20B924,600 in expenses this month: \u20B912,000 rent, \u20B93,400 electricity, \u20B98,000 restocking and \u20B91,200 miscellaneous. Against \u20B958,900 collected, that leaves \u20B934,300 kept.",
  },
  {
    q: "Which payment method is most common?",
    a: "Cash still leads at 58% of collections, UPI is 34% and growing, and the rest is the odd bank transfer. UPI has doubled its share since the start of the quarter.",
  },
  {
    q: "Summarise how the shop is doing",
    a: "\u20B934,400 outstanding across 7 customers. Collection is running ahead of new credit this fortnight, which is healthy. The concern is concentration: Suresh Reddy and Ramesh Yadav together hold \u20B924,200 \u2014 70% of everything outstanding.",
  },
];
