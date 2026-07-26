import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Populates a freshly-created judge account with a realistic, months-old
 * looking kirana ledger — real rows in customers/transactions/expenses,
 * via the admin client (bypasses RLS; every row is explicitly owner_id
 * scoped to the account being seeded). Runs exactly once, right after the
 * account is created — never on a returning judge, so nothing here can
 * ever clobber what a judge has actually done in the workspace.
 */

const NAMES = [
  "Ramesh Yadav", "Lakshmi Devi", "Suresh Reddy", "Anjali Gupta", "Mohammed Irfan",
  "Padma Rao", "Venkat Naidu", "Krishna Murthy", "Sita Rao", "Anand Verma",
  "Priya Sharma", "Rahul Iyer", "Deepa Nair", "Vijay Kumar", "Meena Chandran",
  "Arjun Pillai", "Kavya Reddy", "Sanjay Gowda", "Nithya Krishnan", "Ravi Shankar",
  "Divya Menon", "Manoj Patel", "Swathi Prasad", "Kiran Babu", "Shalini Rao",
  "Ashok Verma", "Pooja Iyengar", "Naveen Chowdary", "Radha Krishnan", "Sunil Achari",
  "Geetha Nagesh", "Prakash Rao", "Vidya Balaji", "Harish Chandra", "Lalitha Devi",
  "Karthik Subramanian", "Anitha Reddy", "Ramu Goud", "Sarala Devi", "Balaji Naicker",
  "Chandrika Rao", "Dinesh Kumar", "Farida Begum", "Gopal Krishna", "Hema Latha",
];

const ITEMS = [
  "chawal 5kg", "atta 10kg", "dal 2kg", "tel 1L", "sakkar 2kg", "chai patti",
  "sabun, tel, masala", "biyyam 25kg", "namak 1kg", "maggi 6 pack", "milk powder",
  "biscuits, chocolates", "detergent 1kg", "onions 5kg", "potatoes 5kg", "eggs 12",
  "toothpaste, soap", "matches, candles", "rice 10kg, dal 3kg", "oil 2L",
];

const PAYMENT_METHODS = ["Cash", "UPI", "Cash", "Cash", "UPI", "Bank Transfer"] as const;
const EXPENSE_CATEGORIES = [
  "Rent", "Electricity", "Water", "Internet", "Salary",
  "Maintenance", "Inventory", "Groceries", "Transport", "Miscellaneous",
] as const;

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.round(rand(min, max));
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export async function seedJudgeWorkspace(admin: SupabaseClient, ownerId: string) {
  // ---- profile: skip onboarding entirely, land straight in the dashboard ----
  await admin.from("profiles").update({
    business_name: "Sharma General Store",
    business_address: "Shop No. 12, Gandhi Market Road, Bengaluru",
    business_type: "kirana",
    owner_phone: "9845012345",
    preferred_language: "en",
    onboarded: true,
    terms_accepted_at: new Date().toISOString(),
    terms_version: "1.0",
  }).eq("id", ownerId);

  // ---- customers ----
  const customerRows = NAMES.map((name) => ({
    owner_id: ownerId,
    name,
    phone: Math.random() > 0.12 ? `9${randInt(100000000, 999999999)}` : null,
    language: pick(["en", "en", "en", "hi", "te"] as const),
    notes: Math.random() > 0.7 ? pick(["Prefers UPI", "Pays monthly", "Regular customer", "New this year"]) : null,
    credit_limit: Math.random() > 0.6 ? randInt(2000, 15000) : null,
  }));

  const { data: customers, error: custError } = await admin
    .from("customers").insert(customerRows).select("id, name");
  if (custError || !customers) throw new Error(`Seeding customers failed: ${custError?.message}`);

  // ---- transactions: 4-14 per customer, spread over the last ~7 months ----
  const txRows: Record<string, unknown>[] = [];
  for (const c of customers) {
    const count = randInt(4, 14);
    let runningBalance = 0;
    for (let i = 0; i < count; i++) {
      const day = randInt(1, 210);
      const isPayment = runningBalance > 0 && Math.random() > 0.45;
      if (isPayment) {
        const amount = Math.round(rand(runningBalance * 0.3, runningBalance) / 10) * 10;
        runningBalance -= amount;
        txRows.push({
          owner_id: ownerId, customer_id: c.id, entry_date: daysAgo(day),
          items: null, credit: 0, payment: amount,
          payment_method: pick(PAYMENT_METHODS), notes: null, verified: true,
        });
      } else {
        const amount = randInt(150, 2200);
        runningBalance += amount;
        txRows.push({
          owner_id: ownerId, customer_id: c.id, entry_date: daysAgo(day),
          items: pick(ITEMS), credit: amount, payment: 0,
          notes: null, verified: true,
        });
      }
    }
  }
  // Chunked inserts — hundreds of rows in one request is fine for Postgres,
  // but keeping batches modest avoids leaning on any one request too hard.
  for (let i = 0; i < txRows.length; i += 300) {
    const { error } = await admin.from("transactions").insert(txRows.slice(i, i + 300));
    if (error) throw new Error(`Seeding transactions failed: ${error.message}`);
  }

  // ---- expenses: ~7 months of recurring + incidental costs ----
  const expenseRows: Record<string, unknown>[] = [];
  for (let month = 0; month < 7; month++) {
    expenseRows.push(
      { owner_id: ownerId, category: "Rent", amount: 12000, spent_at: daysAgo(month * 30 + 2), payment_method: "Bank Transfer", notes: "Monthly rent" },
      { owner_id: ownerId, category: "Electricity", amount: randInt(2200, 4200), spent_at: daysAgo(month * 30 + 5), payment_method: "UPI", notes: null },
      { owner_id: ownerId, category: "Inventory", amount: randInt(6000, 15000), spent_at: daysAgo(month * 30 + 10), payment_method: "Cash", notes: "Restocking" },
      { owner_id: ownerId, category: "Salary", amount: 9000, spent_at: daysAgo(month * 30 + 1), payment_method: "Bank Transfer", notes: "Helper's wages" },
    );
    if (Math.random() > 0.5) {
      expenseRows.push({ owner_id: ownerId, category: pick(EXPENSE_CATEGORIES), amount: randInt(300, 2500), spent_at: daysAgo(randInt(month * 30, month * 30 + 29)), payment_method: pick(PAYMENT_METHODS), notes: null });
    }
  }
  const { error: expError } = await admin.from("expenses").insert(expenseRows);
  if (expError) throw new Error(`Seeding expenses failed: ${expError.message}`);
}
