-- =====================================================================
--  UdhaarAI — migration 004
--  Shop logo + payment receipts.
--  Run AFTER migration-003.sql. Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------- 1
-- The shop's own logo, stored under logos/<user-id>/ in the same private
-- bucket. Appears on every receipt they download.
alter table public.profiles
  add column if not exists logo_path text;

-- ---------------------------------------------------------------- 2
-- Receipts.
--
-- A receipt number must be stable and gapless per shop, because it is the
-- reference a customer quotes back in a dispute. Generating it in the
-- application would race under concurrent requests; a counter row updated
-- inside the issuing function will not.
create table if not exists public.receipt_counters (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  next_no  integer not null default 1
);

alter table public.receipt_counters enable row level security;

drop policy if exists "counter owner" on public.receipt_counters;
create policy "counter owner" on public.receipt_counters
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create table if not exists public.receipts (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  customer_id    uuid not null references public.customers(id) on delete cascade,
  receipt_no     text not null,
  amount         numeric(12,2) not null,
  balance_after  numeric(12,2) not null,
  issued_at      timestamptz not null default now(),
  unique (owner_id, receipt_no)
);

create index if not exists receipts_owner_idx on public.receipts(owner_id, issued_at desc);
create index if not exists receipts_tx_idx    on public.receipts(transaction_id);

alter table public.receipts enable row level security;

drop policy if exists "receipts owner" on public.receipts;
create policy "receipts owner" on public.receipts
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ---------------------------------------------------------------- 3
-- Issue (or re-fetch) a receipt for a payment.
--
-- Re-downloading must return the SAME number, not mint a new one — two
-- different receipts for one payment is exactly the confusion a receipt is
-- supposed to prevent.
create or replace function public.issue_receipt(p_transaction_id uuid)
returns table (
  receipt_no    text,
  amount        numeric,
  balance_after numeric,
  issued_at     timestamptz,
  customer_name text,
  customer_phone text
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_owner    uuid := auth.uid();
  v_tx       record;
  v_existing record;
  v_no       integer;
  v_prefix   text;
  v_receipt  text;
  v_balance  numeric;
begin
  if v_owner is null then
    raise exception 'Not signed in';
  end if;

  select t.id, t.customer_id, t.payment, t.created_at, t.notes, c.name, c.phone
    into v_tx
    from transactions t
    join customers c on c.id = t.customer_id
   where t.id = p_transaction_id
     and t.owner_id = v_owner;

  if v_tx.id is null then
    raise exception 'Payment not found';
  end if;

  if v_tx.payment <= 0 then
    raise exception 'A receipt can only be issued for a payment';
  end if;

  -- Balance for this customer as of now.
  select coalesce(sum(credit - payment), 0) into v_balance
    from transactions
   where customer_id = v_tx.customer_id and owner_id = v_owner;

  -- Already issued? Return it unchanged.
  select r.receipt_no, r.amount, r.balance_after, r.issued_at
    into v_existing
    from receipts r
   where r.transaction_id = p_transaction_id and r.owner_id = v_owner;

  if v_existing.receipt_no is not null then
    return query select v_existing.receipt_no, v_existing.amount,
                        v_existing.balance_after, v_existing.issued_at,
                        v_tx.name::text, v_tx.phone::text;
    return;
  end if;

  -- Reserve the next number atomically.
  insert into receipt_counters (owner_id, next_no)
  values (v_owner, 1)
  on conflict (owner_id) do nothing;

  update receipt_counters
     set next_no = next_no + 1
   where owner_id = v_owner
  returning next_no - 1 into v_no;

  select upper(regexp_replace(coalesce(business_name, 'SHOP'), '[^a-zA-Z]', '', 'g'))
    into v_prefix
    from profiles where id = v_owner;

  v_prefix := coalesce(nullif(substring(v_prefix from 1 for 3), ''), 'UDH');
  v_receipt := v_prefix || '-' || to_char(now(), 'YYYY') || '-' || lpad(v_no::text, 4, '0');

  insert into receipts (owner_id, transaction_id, customer_id, receipt_no, amount, balance_after)
  values (v_owner, p_transaction_id, v_tx.customer_id, v_receipt, v_tx.payment, v_balance);

  return query select v_receipt, v_tx.payment, v_balance, now()::timestamptz,
                      v_tx.name::text, v_tx.phone::text;
end;
$$;

-- Verification:
-- select proname from pg_proc where proname = 'issue_receipt';

-- ---------------------------------------------------------------- 4
-- Terms acceptance, recorded with a timestamp and the version agreed to.
alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version     text;
