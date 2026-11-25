-- PAY54 Batch 45: Actual disposable PostgreSQL catalog/role evidence.
-- Run AFTER Batch38 forward candidate and before rollback, never in staging.
\set ON_ERROR_STOP on
BEGIN READ ONLY;
SET LOCAL statement_timeout = '20s';
DO $audit$
DECLARE
  function_name text;
  function_oid oid;
  function_owner oid;
  financial_owner oid;
  reader_owner oid;
  reader_caller oid;
BEGIN
 IF current_database() <> 'pay54_disposable_ci'
 OR session_user <> 'postgres'
 THEN RAISE EXCEPTION 'PAY54_B45_DISPOSABLE_ONLY'; END IF;

 SELECT oid INTO financial_owner FROM pg_roles WHERE rolname='pay54_ledger_executor_role'
 AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls;
 SELECT oid INTO reader_owner FROM pg_roles WHERE rolname='pay54_wallet_read_owner_role'
 AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls;
 SELECT oid INTO reader_caller FROM pg_roles WHERE rolname='pay54_wallet_read_caller_role'
 AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls;
 IF financial_owner IS NULL OR reader_owner IS NULL OR reader_caller IS NULL
 OR financial_owner=reader_owner OR reader_owner=reader_caller
 THEN RAISE EXCEPTION 'PAY54_B45_ROLE_ISOLATION_MISSING'; END IF;

 FOREACH function_name IN ARRAY ARRAY[
  'pay54.reserve_wallet_transfer(uuid,uuid,uuid,bigint,text,text,timestamp with time zone)',
  'pay54.capture_reserved_wallet_transfer(uuid,uuid)',
  'pay54.release_reserved_wallet_transfer(uuid,uuid,text)'
 ]
 LOOP
  function_oid:=to_regprocedure(function_name);
  IF function_oid IS NULL THEN
   RAISE EXCEPTION 'PAY54_B45_FINANCIAL_FUNCTION_MISSING: %',function_name;
  END IF;
  SELECT proowner INTO function_owner FROM pg_proc WHERE oid=function_oid;
  IF function_owner IS NULL
  OR function_owner IN (financial_owner,reader_owner,reader_caller)
  OR has_function_privilege(financial_owner,function_oid,'EXECUTE')
  OR has_function_privilege(reader_owner,function_oid,'EXECUTE')
  OR has_function_privilege(reader_caller,function_oid,'EXECUTE')
  OR EXISTS (
    SELECT 1 FROM pg_proc p
    CROSS JOIN LATERAL aclexplode(
      COALESCE(p.proacl,acldefault('f',p.proowner))
    ) acl
    WHERE p.oid=function_oid
      AND acl.grantee=0
      AND acl.privilege_type='EXECUTE'
  )
  THEN RAISE EXCEPTION 'PAY54_B45_FINANCIAL_FUNCTION_PRIVILEGE_LEAK: %',function_name;
  END IF;
 END LOOP;

 IF EXISTS (
   SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='pay54'
   AND c.relname IN('ledger_journals','ledger_entries','balance_reservations')
   AND (has_table_privilege(financial_owner,c.oid,'SELECT')
     OR has_table_privilege(financial_owner,c.oid,'INSERT')
     OR has_table_privilege(financial_owner,c.oid,'UPDATE')
     OR has_table_privilege(financial_owner,c.oid,'DELETE'))
 ) THEN RAISE EXCEPTION 'PAY54_B45_EXECUTOR_DIRECT_TABLE_PERMISSION'; END IF;

 RAISE NOTICE 'PASS: finance writer roles remain inert. Positive writer runtime NOT certified.';
END $audit$;
COMMIT;
