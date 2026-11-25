-- Batch44: disposable PostgreSQL 16, AFTER wallet-read forward candidate.
-- Demonstrates actual restricted executor role denial. Does not prove enabled
-- financial writer transaction success. Never run on a shared or live database.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout='25s';
SET LOCAL lock_timeout='5s';
DO $pre$
DECLARE relation_name text;
BEGIN
 IF current_database()<>'pay54_disposable_ci'
 OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='pay54_ledger_executor_role'
  AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls)
 OR to_regprocedure('pay54.wallet_read_restricted_v1(bytea,uuid,uuid,character varying)') IS NULL
 THEN RAISE EXCEPTION 'PAY54_B44_DISPOSABLE_PRECONDITION_DENIED'; END IF;
 FOREACH relation_name IN ARRAY ARRAY['wallets','ledger_accounts','ledger_entries',
   'ledger_journals','balance_reservations']
 LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='pay54' AND c.relname=relation_name
     AND c.relrowsecurity AND c.relforcerowsecurity)
  THEN RAISE EXCEPTION 'PAY54_B44_FORCED_RLS_MISSING: %',relation_name; END IF;
 END LOOP;
END $pre$;
SET ROLE pay54_ledger_executor_role;
DO $denied$
DECLARE rejected boolean:=false;
BEGIN
 IF current_user <> 'pay54_ledger_executor_role'
 OR session_user <> 'postgres'
 THEN RAISE EXCEPTION 'PAY54_B44_WRONG_EFFECTIVE_ROLE'; END IF;
 BEGIN
  EXECUTE 'INSERT INTO pay54.ledger_journals(journal_type) VALUES (''TRANSFER'')';
 EXCEPTION WHEN insufficient_privilege THEN rejected:=true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'PAY54_B44_UNAUTHORISED_WRITER_ACCEPTED'; END IF;
 rejected:=false;
 BEGIN
  PERFORM * FROM pay54.ledger_entries LIMIT 1;
 EXCEPTION WHEN insufficient_privilege THEN rejected:=true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'PAY54_B44_UNAUTHORISED_FINANCIAL_READ_ACCEPTED'; END IF;
 IF has_function_privilege(current_user,
   'pay54.reserve_wallet_transfer(uuid,uuid,uuid,bigint,text,text,timestamp with time zone)',
   'EXECUTE')
 THEN RAISE EXCEPTION 'PAY54_B44_EXECUTOR_MONEY_PERMISSION_LEAK'; END IF;
 RAISE NOTICE 'PASS: real restricted SQL role cannot mutate/read ledger';
END $denied$;
RESET ROLE;
ROLLBACK;
