-- =====================================================================
--  UdhaarAI — migration 003
--  Onboarding: business details captured before the ledger opens.
--  Run AFTER migration-002.sql. Safe to re-run.
-- =====================================================================

alter table public.profiles
  add column if not exists owner_phone   text,
  add column if not exists business_type text default 'kirana',
  add column if not exists onboarded     boolean not null default false;

-- Existing accounts (if any) are treated as already onboarded, so this
-- migration cannot lock a working user out of their own ledger.
update public.profiles
   set onboarded = true
 where onboarded = false
   and business_name is not null
   and business_name <> 'My Shop';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_phone_shape') then
    alter table public.profiles
      add constraint profiles_phone_shape
      check (owner_phone is null or owner_phone ~ '^[6-9][0-9]{9}$');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_type_valid') then
    alter table public.profiles
      add constraint profiles_type_valid
      check (business_type in ('kirana','medical','dairy','hardware','other'));
  end if;
end $$;

-- Verification:
-- select column_name from information_schema.columns
-- where table_name = 'profiles' and column_name in ('owner_phone','business_type','onboarded');
