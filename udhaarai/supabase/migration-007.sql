-- =====================================================================
--  UdhaarAI — migration 007
--  Adds address and credit_limit to customers, for manual customer
--  management (add/edit) in the dashboard.
--  Run AFTER migration-006.sql. Safe to re-run.
-- =====================================================================

alter table public.customers
  add column if not exists address text,
  add column if not exists credit_limit numeric(12,2);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'customers_credit_limit_valid') then
    alter table public.customers
      add constraint customers_credit_limit_valid check (
        credit_limit is null or (credit_limit >= 0 and credit_limit <= 10000000)
      );
  end if;
end $$;

-- Verification:
-- select column_name from information_schema.columns
-- where table_name = 'customers' and column_name in ('address','credit_limit');
