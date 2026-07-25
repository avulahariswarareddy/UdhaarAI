-- =====================================================================
--  UdhaarAI — migration 005
--  Payment methods, expenses, and business analytics.
--  Run AFTER migration-004.sql. Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------- 1
-- Record HOW a payment was made, for the payment-mode breakdown.
alter table public.transactions
  add column if not exists payment_method text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tx_method_valid') then
    alter table public.transactions
      add constraint tx_method_valid check (
        payment_method is null or payment_method in
        ('Cash','UPI','Credit Card','Debit Card','Bank Transfer','Cheque','Other')
      );
  end if;
end $$;

-- ---------------------------------------------------------------- 2
-- record_payment now takes a method. Replacing the older 3-arg version.
create or replace function public.record_payment(
  p_customer_id uuid,
  p_amount numeric,
  p_method text default 'Cash',
  p_note text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_owner uuid;
  v_method text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Payment must be more than zero'; end if;
  if p_amount > 1000000 then raise exception 'That amount looks wrong — over 10 lakh'; end if;

  select owner_id into v_owner from customers where id = p_customer_id;
  if v_owner is null or v_owner <> auth.uid() then raise exception 'Customer not found'; end if;

  v_method := case
    when p_method in ('Cash','UPI','Credit Card','Debit Card','Bank Transfer','Cheque','Other')
    then p_method else 'Cash' end;

  insert into transactions
    (owner_id, customer_id, entry_date, credit, payment, payment_method, notes, verified)
  values
    (auth.uid(), p_customer_id, current_date, 0, round(p_amount, 2), v_method,
     coalesce(nullif(trim(p_note), ''), 'Paid at counter'), true)
  returning id into v_id;

  insert into audit_logs (owner_id, action, detail)
  values (auth.uid(), 'payment_recorded',
          jsonb_build_object('customer_id', p_customer_id, 'amount', p_amount, 'method', v_method));

  return v_id;
end;
$$;

-- ---------------------------------------------------------------- 3
-- Expenses.
create table if not exists public.expenses (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) on delete cascade,
  category       text not null default 'Miscellaneous',
  amount         numeric(12,2) not null check (amount > 0 and amount <= 10000000),
  payment_method text,
  spent_at       date not null default current_date,
  notes          text,
  bill_path      text,
  created_at     timestamptz default now(),
  constraint expense_category_valid check (category in
    ('Rent','Electricity','Water','Internet','Salary','Maintenance',
     'Inventory','Groceries','Transport','Miscellaneous'))
);

create index if not exists expenses_owner_idx on public.expenses(owner_id, spent_at desc);

alter table public.expenses enable row level security;

drop policy if exists "expenses owner" on public.expenses;
create policy "expenses owner" on public.expenses
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ---------------------------------------------------------------- 4
-- Analytics in one round trip. The application does the shaping and any
-- forecasting; this just supplies clean sums the pure functions consume.
create or replace function public.business_analytics()
returns json
language sql
security invoker
stable
set search_path = public
as $$
  with tx as (select * from transactions where owner_id = auth.uid()),
       ex as (select * from expenses where owner_id = auth.uid())
  select json_build_object(
    'month_collected',  coalesce((select sum(payment) from tx where created_at >= date_trunc('month', now())), 0),
    'month_credit',     coalesce((select sum(credit)  from tx where created_at >= date_trunc('month', now())), 0),
    'month_expenses',   coalesce((select sum(amount)  from ex where spent_at   >= date_trunc('month', now())::date), 0),
    'today_collected',  coalesce((select sum(payment) from tx where created_at::date = current_date), 0),
    'today_expenses',   coalesce((select sum(amount)  from ex where spent_at = current_date), 0),
    'total_credit',     coalesce((select sum(credit)  from tx), 0),
    'total_paid',       coalesce((select sum(payment) from tx), 0),
    'outstanding',      coalesce((select sum(credit - payment) from tx), 0),
    'payment_modes',    coalesce((select json_agg(m) from (
                          select coalesce(payment_method,'Cash') as method, sum(payment) as total, count(*) as count
                          from tx where payment > 0 group by 1 order by 2 desc) m), '[]'::json),
    'expense_categories', coalesce((select json_agg(c) from (
                          select category, sum(amount) as total, count(*) as count
                          from ex group by 1 order by 2 desc) c), '[]'::json)
  );
$$;

-- Verification:
-- select proname from pg_proc where proname in ('record_payment','business_analytics');
-- select tablename, rowsecurity from pg_tables where tablename = 'expenses';
