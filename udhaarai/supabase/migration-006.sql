-- =====================================================================
--  UdhaarAI — migration 006
--  Fixes the AI Note "Could not record that payment" bug.
--  Run AFTER migration-005.sql. Safe to re-run.
-- =====================================================================

-- migration-005's comment said it was "replacing the older 3-arg version"
-- of record_payment, but `create or replace function` only replaces a
-- function with an IDENTICAL parameter signature. Adding p_method created
-- a SECOND overload instead — the old 3-arg record_payment(uuid, numeric,
-- text) was never dropped, so two ambiguous overloads have existed side by
-- side since migration-005. PostgREST cannot reliably resolve which one to
-- call, so every /api/payment RPC call fails with a generic function-not-
-- found/ambiguous error, which the API surfaces as "Could not record that
-- payment." Dropping the superseded overload leaves only the 4-arg version
-- migration-005 actually intended to ship.
drop function if exists public.record_payment(uuid, numeric, text);

-- Verification:
-- select proname, pg_get_function_identity_arguments(oid)
-- from pg_proc where proname = 'record_payment';
-- (should return exactly one row)
