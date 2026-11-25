-- PAY54 Batch56 — actual PostgreSQL canonical writer admission (DENY / READ ONLY).
-- Evaluates the candidate FORCE RLS financial schema. No privileges, no writes,
-- no service credentials, no executed PAY54 customer-money function.
\set ON_ERROR_STOP on
BEGIN READ ONLY;
SET LOCAL statement_timeout='20s';
DO $preflight$
DECLARE
  role_oid oid;
  f_oid oid;
  function_signature text;
  table_name text;
  actual_forced integer;
  insufficient text[]:=ARRAY[]::text[];
BEGIN
 IF current_database()<>'pay54_disposable_ci'
  OR session_user<>'postgres'
  OR current_user<>'postgres'
  OR to_regprocedure('pay54.wallet_read_restricted_v1(bytea,uuid,uuid,character varying)') IS NULL
 THEN RAISE EXCEPTION 'PAY54_B56_DISPOSABLE_FORWARD_ONLY'; END IF;
 SELECT oid INTO role_oid FROM pg_roles WHERE rolname='pay54_ledger_executor_role'
  AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolinherit;
 IF role_oid IS NULL THEN RAISE EXCEPTION 'PAY54_B56_EXECUTOR_ROLE_PRECONDITION_FAILED'; END IF;
 SELECT count(*) INTO actual_forced
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='pay54'
 AND c.relname=ANY(ARRAY['wallets','ledger_accounts','ledger_entries',
                          'ledger_journals','balance_reservations'])
 AND c.relkind='r' AND c.relrowsecurity AND c.relforcerowsecurity;
 IF actual_forced<>5 THEN
  RAISE EXCEPTION 'PAY54_B56_FINANCIAL_FORCE_RLS_NOT_IN_PLACE';
 END IF;
 FOREACH function_signature IN ARRAY ARRAY[
  'pay54.reserve_wallet_transfer(uuid,uuid,uuid,bigint,text,text,timestamp with time zone)',
  'pay54.capture_reserved_wallet_transfer(uuid,uuid)',
  'pay54.release_reserved_wallet_transfer(uuid,uuid,text)'
 ] LOOP
  f_oid:=to_regprocedure(function_signature);
  IF f_oid IS NULL OR NOT EXISTS(
    SELECT 1 FROM pg_proc WHERE oid=f_oid AND NOT prosecdef
  ) THEN RAISE EXCEPTION 'PAY54_B56_FINANCIAL_INVOKER_CONTRACT_CHANGED: %',function_signature;
  END IF;
  IF has_function_privilege(role_oid,f_oid,'EXECUTE')
  OR EXISTS(SELECT 1 FROM pg_proc p CROSS JOIN LATERAL
    aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) acl
    WHERE p.oid=f_oid AND acl.grantee=0 AND acl.privilege_type='EXECUTE')
  THEN RAISE EXCEPTION 'PAY54_B56_CANONICAL_FINANCIAL_EXECUTION_EXPOSED: %',function_signature; END IF;
  insufficient:=array_append(insufficient,function_signature);
 END LOOP;
 FOREACH table_name IN ARRAY ARRAY[
  'financial_operations','idempotency_records','balance_reservations',
  'ledger_accounts','wallets','ledger_journals','ledger_entries',
  'outbox_events','provider_attempts'
 ] LOOP
  IF to_regclass(format('pay54.%I',table_name)) IS NULL
  THEN RAISE EXCEPTION 'PAY54_B56_FINANCIAL_RELATION_MISSING: %',table_name; END IF;
  IF has_table_privilege(role_oid,format('pay54.%I',table_name),'INSERT')
  OR has_table_privilege(role_oid,format('pay54.%I',table_name),'UPDATE')
  OR has_table_privilege(role_oid,format('pay54.%I',table_name),'DELETE')
  THEN RAISE EXCEPTION 'PAY54_B56_FINANCIAL_DML_LEAK: %',table_name; END IF;
 END LOOP;
 IF cardinality(insufficient)<>3 THEN
  RAISE EXCEPTION 'PAY54_B56_FINANCIAL_COMMAND_SET_INCOMPLETE'; END IF;
 RAISE NOTICE 'PAY54_B56_PASS: canonical financial writer remains disabled after FORCE RLS; positive writer admission NOT established';
END $preflight$;
COMMIT;
