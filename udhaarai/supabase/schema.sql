-- =====================================================================
--  UdhaarAI — full database schema
--  Run this ONCE in Supabase Dashboard > SQL Editor > New query > Run.
--  Every table has Row Level Security. Every policy scopes rows to the
--  logged-in shopkeeper, so the browser anon key can never read another
--  shop's ledger.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- 1
create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  full_name         text,
  business_name     text default 'My Shop',
  business_address  text,
  preferred_language text default 'en' check (preferred_language in ('en','hi','te')),
  created_at        timestamptz default now()
);

-- ---------------------------------------------------------------- 2
create table if not exists public.customers (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  phone       text,
  notes       text,
  language    text default 'en',
  created_at  timestamptz default now(),
  unique (owner_id, name)
);
create index if not exists customers_owner_idx on public.customers(owner_id);

-- ---------------------------------------------------------------- 3
create table if not exists public.uploads (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  status       text not null default 'processing'
               check (status in ('processing','needs_review','saved','failed')),
  page_language text,
  error_message text,
  created_at   timestamptz default now()
);
create index if not exists uploads_owner_idx on public.uploads(owner_id, created_at desc);

-- ---------------------------------------------------------------- 4
-- Raw Gemini output, kept so you can audit what the model actually read
create table if not exists public.ocr_results (
  id         uuid primary key default gen_random_uuid(),
  upload_id  uuid not null references public.uploads(id) on delete cascade,
  owner_id   uuid not null references auth.users(id) on delete cascade,
  raw        jsonb not null,
  created_at timestamptz default now()
);
create index if not exists ocr_upload_idx on public.ocr_results(upload_id);

-- ---------------------------------------------------------------- 5
create table if not exists public.transactions (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  customer_id   uuid not null references public.customers(id) on delete cascade,
  upload_id     uuid references public.uploads(id) on delete set null,
  entry_date    date,
  raw_date_text text,
  items         text,
  credit        numeric(12,2) not null default 0 check (credit >= 0),
  payment       numeric(12,2) not null default 0 check (payment >= 0),
  notes         text,
  confidence    jsonb,
  verified      boolean not null default false,
  created_at    timestamptz default now()
);
create index if not exists tx_owner_idx    on public.transactions(owner_id, created_at desc);
create index if not exists tx_customer_idx on public.transactions(customer_id);

-- ---------------------------------------------------------------- 6
create table if not exists public.reminders (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  language    text,
  tone        text,
  body        text,
  created_at  timestamptz default now()
);

-- ---------------------------------------------------------------- 7
create table if not exists public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid references auth.users(id) on delete set null,
  action     text not null,
  detail     jsonb,
  created_at timestamptz default now()
);
create index if not exists audit_owner_idx on public.audit_logs(owner_id, created_at desc);

-- =====================================================================
--  ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles     enable row level security;
alter table public.customers    enable row level security;
alter table public.uploads      enable row level security;
alter table public.ocr_results  enable row level security;
alter table public.transactions enable row level security;
alter table public.reminders    enable row level security;
alter table public.audit_logs   enable row level security;

-- profiles: a user sees only their own row
drop policy if exists "profiles self" on public.profiles;
create policy "profiles self" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- every other table: owner_id must equal the caller
do $$
declare t text;
begin
  foreach t in array array['customers','uploads','ocr_results','transactions','reminders']
  loop
    execute format('drop policy if exists "owner all" on public.%I', t);
    execute format(
      'create policy "owner all" on public.%I for all
         using (auth.uid() = owner_id) with check (auth.uid() = owner_id)', t);
  end loop;
end $$;

-- audit_logs: readable by owner, insert-only from the server
drop policy if exists "audit read own" on public.audit_logs;
create policy "audit read own" on public.audit_logs
  for select using (auth.uid() = owner_id);

-- =====================================================================
--  Auto-create a profile on signup
--  search_path is pinned — an unpinned search_path in a SECURITY DEFINER
--  function is a privilege-escalation hole.
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, business_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'business_name', 'My Shop')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
--  Dashboard totals — one round trip instead of six
-- =====================================================================
create or replace function public.dashboard_summary()
returns json
language sql
security invoker
stable
set search_path = public
as $$
  select json_build_object(
    'total_customers',   (select count(*) from customers where owner_id = auth.uid()),
    'outstanding',       coalesce((select sum(credit - payment) from transactions where owner_id = auth.uid()), 0),
    'today_collection',  coalesce((select sum(payment) from transactions where owner_id = auth.uid() and created_at::date = current_date), 0),
    'today_credit',      coalesce((select sum(credit)  from transactions where owner_id = auth.uid() and created_at::date = current_date), 0),
    'month_collection',  coalesce((select sum(payment) from transactions where owner_id = auth.uid() and created_at >= date_trunc('month', now())), 0),
    'month_credit',      coalesce((select sum(credit)  from transactions where owner_id = auth.uid() and created_at >= date_trunc('month', now())), 0),
    'entries',           (select count(*) from transactions where owner_id = auth.uid())
  );
$$;

-- Per-customer balances, sorted by who owes the most
create or replace function public.customer_balances()
returns table (
  id uuid, name text, phone text,
  credit numeric, paid numeric, outstanding numeric,
  last_entry timestamptz, entry_count bigint
)
language sql
security invoker
stable
set search_path = public
as $$
  select c.id, c.name, c.phone,
         coalesce(sum(t.credit), 0),
         coalesce(sum(t.payment), 0),
         coalesce(sum(t.credit - t.payment), 0),
         max(t.created_at),
         count(t.id)
  from customers c
  left join transactions t on t.customer_id = c.id
  where c.owner_id = auth.uid()
  group by c.id, c.name, c.phone
  order by 6 desc;
$$;

-- Daily collection vs credit for the analytics chart
create or replace function public.daily_trend(days int default 30)
returns table (day date, credit numeric, payment numeric)
language sql
security invoker
stable
set search_path = public
as $$
  select d::date,
         coalesce(sum(t.credit), 0),
         coalesce(sum(t.payment), 0)
  from generate_series(current_date - (days - 1), current_date, '1 day') d
  left join transactions t
    on t.created_at::date = d::date and t.owner_id = auth.uid()
  group by d order by d;
$$;
