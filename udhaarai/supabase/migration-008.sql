-- =====================================================================
--  UdhaarAI — migration 008 (OPTIONAL — the app no longer requires it)
--
--  The true root cause of "Could not record that payment": audit_logs
--  has RLS enabled with a select-only policy, but record_payment() is
--  `security invoker` and inserts an audit row as the signed-in user.
--  That insert raised 42501 and rolled back the whole payment, from the
--  function's very first deployment. (migration-006's overload cleanup
--  was a red herring — PostgREST disambiguates by named arguments.)
--
--  /api/payment now bypasses the function entirely: it inserts the
--  transaction under the user's session and writes the audit row with
--  the service role. This migration just defuses the function for any
--  future caller by allowing owners to insert their own audit rows.
-- =====================================================================

drop policy if exists "audit insert own" on public.audit_logs;
create policy "audit insert own" on public.audit_logs
  for insert with check (auth.uid() = owner_id);

-- Verification:
-- select policyname, cmd from pg_policies where tablename = 'audit_logs';
