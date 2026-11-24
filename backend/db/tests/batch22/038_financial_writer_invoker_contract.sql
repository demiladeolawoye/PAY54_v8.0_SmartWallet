-- PAY54 Batch 46: disposable PostgreSQL security boundary verification.
-- Run after candidate wallet-read forward and before rollback. No mutation.
\set ON_ERROR_STOP on
BEGIN READ ONLY;
SET LOCAL statement_timeout='20s';
DO $check$
DECLARE
 fn text;
 oid_fn oid;
 role_oid oid;
BEGIN
 IF current_database() <> 'pay54_disposable_ci'
 OR session_user <> 'postgres'
 OR to_regprocedure('pay54.wallet_read_restricted_v1(bytea,uuid,uuid,character varying)') IS NULL
 THEN RAISE EXCEPTION 'PAY54_B46_DISPOSABLE_CANDIDATE_REQUIRED'; END IF;
 SELECT oid INTO role_oid FROM pg_roles
 WHERE rolname='pay54_ledger_executor_role'
 AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolinherit;
 IF role_oid IS NULL THEN RAISE EXCEPTION 'PAY54_B46_INERT_EXECUTOR_MISSING'; END IF;

 FOREACH fn IN ARRAY ARRAY[
  'pay54.reserve_wallet_transfer(uuid,uuid,uuid,bigint,text,text,timestamp with time zone)',
  'pay54.capture_reserved_wallet_transfer(uuid,uuid)',
  'pay54.release_reserved_wallet_transfer(uuid,uuid,text)'
 ] LOOP
  SELECT oid INTO oid_fn FROM pg_proc
  WHERE oid=to_regprocedure(fn)
  AND NOT prosecdef;
  IF oid_fn IS NULL OR has_function_privilege(role_oid,oid_fn,'EXECUTE')
  THEN RAISE EXCEPTION 'PAY54_B46_UNSAFE_INVOKER_BOUNDARY: %',fn; END IF;
 END LOOP;

 IF EXISTS (
  SELECT 1 FROM pg_class c
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='pay54'
  AND c.relname IN('wallets','ledger_accounts','ledger_entries',
    'ledger_journals','balance_reservations')
  AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity)
 ) THEN RAISE EXCEPTION 'PAY54_B46_FINANCIAL_RLS_NOT_FORCED'; END IF;

 IF EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname='pay54'
   AND tablename IN('wallets','ledger_accounts','ledger_entries',
    'ledger_journals','balance_reservations')
   AND (cmd IN ('INSERT','UPDATE','DELETE','ALL'))
   AND ('pay54_ledger_executor_role'=ANY(roles) OR 'public'=ANY(roles))
 ) THEN RAISE EXCEPTION 'PAY54_B46_UNREVIEWED_WRITE_POLICY'; END IF;

 RAISE NOTICE 'PASS: invoker functions and inactive executor confirmed. Positive writer execution remains NO-GO.';
END $check$;
COMMIT;
