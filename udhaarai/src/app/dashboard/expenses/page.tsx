import { createClient } from "@/lib/supabase/server";
import { ExpensesClient } from "@/components/ExpensesClient";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("expenses")
    .select("id, category, amount, payment_method, spent_at, notes")
    .order("spent_at", { ascending: false })
    .limit(200);

  return <ExpensesClient initial={data ?? []} />;
}
