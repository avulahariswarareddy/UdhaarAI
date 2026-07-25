-- =====================================================================
--  UdhaarAI — migration 002
--  Adds: duplicate-page detection, manual payment recording, and the
--  risk/collections data source.
--
--  Run AFTER schema.sql and storage.sql. Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------- 1
-- Perceptual hash of each uploaded page, computed in the browser.
-- Lets the app say "you already uploaded this page on the 3rd" instead of
-- silently double-counting a customer's balance — the single most damaging
-- mistake a ledger app can make.
alter table public.uploads
  add column if not exists page_hash text;

create index if not exists uploads_hash_idx
  on public.uploads(owner_id, page_hash)
  where page_hash is not null;

-- ---------------------------------------------------------------- 2
-- Manual payment entry.
--
-- Until now money could only enter the ledger through a photographed page.
-- In a real shop a customer pays at the counter and the shopkeeper wants it
-- recorded in two seconds. This is a function rather than a plain insert so
-- that validation lives in the database and cannot be bypassed by anything
-- holding the anon key.
create or replace function public.record_payment(
  p_customer_id uuid,
  p_amount numeric,
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
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment must be more than zero';
  end if;

  if p_amount > 1000000 then
    raise exception 'That amount looks wrong — over 10 lakh';
  end if;

  -- Ownership check in the database, not just in the route handler.
  select owner_id into v_owner
  from customers
  where id = p_customer_id;

  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'Customer not found';
  end if;

  insert into transactions
    (owner_id, customer_id, entry_date, credit, payment, notes, verified)
  values
    (auth.uid(), p_customer_id, current_date, 0, round(p_amount, 2),
     coalesce(nullif(trim(p_note), ''), 'Paid at counter'), true)
  returning id into v_id;

  insert into audit_logs (owner_id, action, detail)
  values (auth.uid(), 'payment_recorded',
          jsonb_build_object('customer_id', p_customer_id, 'amount', p_amount));

  return v_id;
end;
$$;

-- ---------------------------------------------------------------- 3
-- Everything the risk scorer needs, in one round trip.
--
-- Deliberately returns raw facts, not a score. The scoring itself is a pure
-- TypeScript function (src/lib/verify/risk.ts) so it is unit-testable and
-- its reasoning can be shown to the admin. The database supplies evidence;
-- the application does the judging.
create or replace function public.customer_risk_input()
returns table (
  id           uuid,
  name         text,
  phone        text,
  credit       numeric,
  paid         numeric,
  outstanding  numeric,
  last_entry   timestamptz,
  last_payment timestamptz,
  entry_count  bigint,
  first_entry  timestamptz
)
language sql
security invoker
stable
set search_path = public
as $$
  select
    c.id,
    c.name,
    c.phone,
    coalesce(sum(t.credit), 0)               as credit,
    coalesce(sum(t.payment), 0)              as paid,
    coalesce(sum(t.credit - t.payment), 0)   as outstanding,
    max(t.created_at)                        as last_entry,
    max(t.created_at) filter (where t.payment > 0) as last_payment,
    count(t.id)                              as entry_count,
    min(t.created_at)                        as first_entry
  from customers c
  left join transactions t on t.customer_id = c.id
  where c.owner_id = auth.uid()
  group by c.id, c.name, c.phone
  order by 6 desc;
$$;

-- ---------------------------------------------------------------- 4
-- Length guards. The client caps these, but a client cap is a convenience,
-- not a control — anything holding the anon key can POST directly.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_name_len') then
    alter table public.profiles
      add constraint profiles_name_len check (char_length(business_name) <= 120);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_addr_len') then
    alter table public.profiles
      add constraint profiles_addr_len check (char_length(coalesce(business_address, '')) <= 300);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'customers_name_len') then
    alter table public.customers
      add constraint customers_name_len check (char_length(name) between 1 and 120);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tx_amount_sane') then
    alter table public.transactions
      add constraint tx_amount_sane check (credit <= 10000000 and payment <= 10000000);
  end if;
end $$;

-- ---------------------------------------------------------------- 5
-- Verification. Every row must return true.
-- select proname, prosecdef from pg_proc
-- where proname in ('record_payment','customer_risk_input','dashboard_summary');
