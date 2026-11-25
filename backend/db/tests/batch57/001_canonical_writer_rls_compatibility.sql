-- PAY54 Batch57 — actual FORCE RLS canonical schema, least-privilege read-only diagnostic.
-- Real PostgreSQL catalog and restricted effective-role checks, NO grants or money DML.
\set ON_ERROR_STOP on
BEGIN READ ONLY ISOLATION LEVEL READ COMMITTED;
SET LOCAL statement_timeout='25s';
DO $assert$
DECLARE
  role_id oid; n integer; key text; policy_count integer;
  table_name text; command text;
BEGIN
 IF current_database()<>'pay54_disposable_ci' OR current_user<>'postgres'
 OR to_regprocedure('pay54.wallet_read_restricted_v1(bytea,uuid,uuid,character varying)') IS NULL
 THEN RAISE EXCEPTION 'PAY54_B57_DISPOSABLE_FORCE_RLS_REQUIRED'; END IF;
 SELECT oid INTO role_id FROM pg_roles WHERE rolname='pay54_ledger_executor_role'
   AND NOT rolsuper AND NOT rolcanlogin AND NOT rolbypassrls AND NOT rolinherit;
 IF role_id IS NULL THEN RAISE EXCEPTION 'PAY54_B57_EFFECTIVE_ROLE_MISSING'; END IF;
 IF EXISTS(SELECT 1 FROM pg_auth_members WHERE member=role_id OR roleid=role_id)
 THEN RAISE EXCEPTION 'PAY54_B57_UNREVIEWED_EXECUTOR_ROLE_MEMBERSHIP'; END IF;
 FOREACH table_name IN ARRAY ARRAY[
   'wallets','ledger_accounts','ledger_entries','ledger_journals','balance_reservations'
 ] LOOP
  SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace
   WHERE ns.nspname='pay54' AND c.relname=table_name
     AND c.relkind='r' AND c.relrowsecurity AND c.relforcerowsecurity;
  IF n<>1 THEN RAISE EXCEPTION 'PAY54_B57_FORCE_RLS_MISSING: %',table_name; END IF;
  IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='pay54'
    AND tablename=table_name AND cmd IN ('INSERT','UPDATE','DELETE','ALL')
    AND ('pay54_ledger_executor_role'=ANY(roles) OR 'public'=ANY(roles)))
  THEN RAISE EXCEPTION 'PAY54_B57_UNREVIEWED_WRITER_POLICY: %',table_name; END IF;
 END LOOP;
 FOREACH table_name IN ARRAY ARRAY[
  'financial_operations','idempotency_records','balance_reservations',
  'ledger_accounts','wallets','ledger_journals','ledger_entries',
  'outbox_events','provider_attempts','auth_sessions',
  'account_contexts','account_memberships','personal_wallet_bindings'
 ] LOOP
  IF to_regclass(format('pay54.%I',table_name)) IS NULL
  THEN RAISE EXCEPTION 'PAY54_B57_REQUIRED_RELATION_MISSING: %',table_name; END IF;
  IF has_table_privilege(role_id,format('pay54.%I',table_name),'SELECT')
   OR has_table_privilege(role_id,format('pay54.%I',table_name),'INSERT')
   OR has_table_privilege(role_id,format('pay54.%I',table_name),'UPDATE')
   OR has_table_privilege(role_id,format('pay54.%I',table_name),'DELETE')
  THEN RAISE EXCEPTION 'PAY54_B57_UNREVIEWED_EXECUTOR_DML: %',table_name; END IF;
 END LOOP;
 RAISE NOTICE 'PAY54_B57_PASS: catalog confirms unprivileged writer with FORCE RLS, no unexpected write policy';
END $assert$;
SET LOCAL ROLE pay54_ledger_executor_role;
DO $identity$
DECLARE
  denied boolean:=false;
BEGIN
 IF current_user<>'pay54_ledger_executor_role'
 OR (SELECT rolsuper OR rolbypassrls OR rolcanlogin FROM pg_roles WHERE rolname=current_user)
 THEN RAISE EXCEPTION 'PAY54_B57_WRONG_EFFECTIVE_ROLE'; END IF;
 BEGIN
  PERFORM 1 FROM pay54.ledger_accounts LIMIT 1;
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'PAY54_B57_CANONICAL_LEDGER_UNEXPECTEDLY_VISIBLE'; END IF;
 IF has_function_privilege(current_user,
 'pay54.reserve_wallet_transfer(uuid,uuid,uuid,bigint,text,text,timestamp with time zone)','EXECUTE')
 OR has_function_privilege(current_user,
 'pay54.capture_reserved_wallet_transfer(uuid,uuid)','EXECUTE')
 OR has_function_privilege(current_user,
 'pay54.release_reserved_wallet_transfer(uuid,uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'PAY54_B57_CANONICAL_EXECUTE_EXPOSED'; END IF;
 RAISE NOTICE 'PAY54_B57_PASS: real switched financial executor rejected by canonical SQL';
END $identity$;
RESET ROLE;
COMMIT;
