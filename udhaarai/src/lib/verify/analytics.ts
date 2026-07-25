/**
 * Business analytics — pure functions over rows the database returns.
 *
 * These do the arithmetic the prompt asks the "AI" for: revenue, expenses,
 * profit, recovery rate, payment-mode and expense-category breakdowns. None
 * of it goes near a model. A profit figure a shopkeeper acts on must be
 * reproducible and testable, and "ask Gemini to add up my month" is neither.
 */

export type TxRow = {
  credit: number;
  payment: number;
  payment_method?: string | null;
  created_at: string;
};

export type ExpenseRow = {
  amount: number;
  category: string;
  spent_at: string;
  created_at: string;
};

const inWindow = (iso: string, since: Date) => new Date(iso) >= since;

export function startOf(period: "today" | "week" | "month", now = new Date()): Date {
  const d = new Date(now);
  if (period === "today") {
    d.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    const dow = (d.getDay() + 6) % 7; // Monday-based
    d.setDate(d.getDate() - dow);
    d.setHours(0, 0, 0, 0);
  } else {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
  }
  return d;
}

export type Summary = {
  collected: number;
  creditGiven: number;
  expenses: number;
  /** collected minus expenses — the cash actually kept */
  profit: number;
};

export function summarise(
  txs: TxRow[],
  expenses: ExpenseRow[],
  period: "today" | "week" | "month",
  now = new Date()
): Summary {
  const since = startOf(period, now);
  const collected = txs
    .filter((t) => inWindow(t.created_at, since))
    .reduce((s, t) => s + Number(t.payment || 0), 0);
  const creditGiven = txs
    .filter((t) => inWindow(t.created_at, since))
    .reduce((s, t) => s + Number(t.credit || 0), 0);
  const spent = expenses
    .filter((e) => inWindow(e.spent_at ?? e.created_at, since))
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  return {
    collected: round(collected),
    creditGiven: round(creditGiven),
    expenses: round(spent),
    profit: round(collected - spent),
  };
}

/**
 * Recovery rate: of all credit ever given, how much has come back.
 * Bounded to 0-100 so a data quirk (more paid than credited, from an opening
 * balance) can't render as 137%.
 */
export function recoveryRate(txs: TxRow[]): number {
  const credit = txs.reduce((s, t) => s + Number(t.credit || 0), 0);
  const paid = txs.reduce((s, t) => s + Number(t.payment || 0), 0);
  if (credit <= 0) return paid > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, Math.round((paid / credit) * 100)));
}

export function paymentModeBreakdown(txs: TxRow[]): { method: string; total: number; count: number }[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const t of txs) {
    if (Number(t.payment || 0) <= 0) continue;
    const key = normaliseMethod(t.payment_method);
    const cur = map.get(key) ?? { total: 0, count: 0 };
    cur.total += Number(t.payment);
    cur.count += 1;
    map.set(key, cur);
  }
  return [...map.entries()]
    .map(([method, v]) => ({ method, total: round(v.total), count: v.count }))
    .sort((a, b) => b.total - a.total);
}

export function expenseCategoryBreakdown(expenses: ExpenseRow[]): { category: string; total: number; count: number }[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const e of expenses) {
    const key = e.category || "Miscellaneous";
    const cur = map.get(key) ?? { total: 0, count: 0 };
    cur.total += Number(e.amount || 0);
    cur.count += 1;
    map.set(key, cur);
  }
  return [...map.entries()]
    .map(([category, v]) => ({ category, total: round(v.total), count: v.count }))
    .sort((a, b) => b.total - a.total);
}

export const PAYMENT_METHODS = [
  "Cash", "UPI", "Credit Card", "Debit Card", "Bank Transfer", "Cheque", "Other",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

function normaliseMethod(m?: string | null): string {
  if (!m) return "Cash";
  const hit = PAYMENT_METHODS.find((p) => p.toLowerCase() === m.toLowerCase());
  return hit ?? "Other";
}

export const EXPENSE_CATEGORIES = [
  "Rent", "Electricity", "Water", "Internet", "Salary", "Maintenance",
  "Inventory", "Groceries", "Transport", "Miscellaneous",
] as const;

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
