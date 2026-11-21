-- PAY54 PR61: disposable PostgreSQL post-migration runtime-activation deny gate.
-- Read-only catalogue assertions. No CREATE ROLE, GRANT, migration or live execution.
\set ON_ERROR_STOP on
BEGIN READ ONLY;
SET LOCAL statement_timeout='15s';

DO $check$
DECLARE
 owner_oid oid;
 caller_oid oid;
 wrapper_oid oid;
 writer_oid oid;
 obj record;
BEGIN
 SELECT oid INTO owner_oid FROM pg_roles
 WHERE rolname='pay54_paytag_function_owner_role'
   AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls
   AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolinherit;
 SELECT oid INTO caller_oid FROM pg_roles
 WHERE rolname='pay54_paytag_register_role'
   AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls
   AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolinherit;
 wrapper_oid:=to_regprocedure(
  'pay54.register_paytag_restricted(bytea,bytea,uuid,bigint,uuid,uuid,text,bytea,bytea,uuid,uuid)');
 writer_oid:=to_regprocedure(
  'pay54.register_paytag_trusted(bytea,bytea,uuid,bigint,uuid,uuid,text,bytea,bytea,uuid,uuid)');
 IF owner_oid IS NULL OR caller_oid IS NULL OR owner_oid=caller_oid
 OR wrapper_oid IS NULL OR writer_oid IS NULL
 OR EXISTS (SELECT 1 FROM pg_auth_members
            WHERE roleid IN (owner_oid,caller_oid)
               OR member IN (owner_oid,caller_oid))
 THEN RAISE EXCEPTION 'PAY54_PAYTAG_PR61_ROLE_GRAPH_DENIED'; END IF;

 IF NOT EXISTS (
   SELECT 1 FROM pg_proc
   WHERE oid=wrapper_oid AND proowner=owner_oid AND prosecdef
     AND EXISTS (
       SELECT 1 FROM unnest(proconfig) AS setting
       WHERE regexp_replace(setting,'[[:space:]]+','','g') =
         'search_path=pg_catalog,pay54,pg_temp'
     )
 ) OR EXISTS (SELECT 1 FROM pg_proc WHERE oid=writer_oid AND prosecdef)
 OR NOT has_function_privilege('pay54_paytag_register_role',wrapper_oid,'EXECUTE')
 OR has_function_privilege('pay54_paytag_register_role',writer_oid,'EXECUTE')
 OR EXISTS (
   SELECT 1 FROM pg_proc p,
     LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
   WHERE p.oid=wrapper_oid AND acl.grantee=0 AND acl.privilege_type='EXECUTE'
 )
 THEN RAISE EXCEPTION 'PAY54_PAYTAG_PR61_FUNCTION_BOUNDARY_DENIED'; END IF;

 IF has_schema_privilege('pay54_paytag_register_role','pay54','CREATE')
 OR has_schema_privilege('pay54_paytag_function_owner_role','pay54','CREATE')
 OR EXISTS (
   SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='pay54' AND c.relkind IN ('r','p','v','m','f')
     AND (
       has_table_privilege('pay54_paytag_register_role',c.oid,'SELECT')
       OR has_table_privilege('pay54_paytag_register_role',c.oid,'INSERT')
       OR has_table_privilege('pay54_paytag_register_role',c.oid,'UPDATE')
       OR has_table_privilege('pay54_paytag_register_role',c.oid,'DELETE')
       OR has_table_privilege('pay54_paytag_register_role',c.oid,'TRUNCATE')
       OR has_table_privilege('pay54_paytag_register_role',c.oid,'TRIGGER')
     )
 )
 THEN RAISE EXCEPTION 'PAY54_PAYTAG_PR61_DIRECT_CALLER_DML_DENIED'; END IF;

 IF EXISTS (
  SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='pay54' AND c.relname IN (
   'ledger_entries','ledger_journals','financial_operations',
   'balance_reservations','outbox_events','provider_attempts')
  AND (
   has_table_privilege('pay54_paytag_function_owner_role',c.oid,'INSERT')
   OR has_table_privilege('pay54_paytag_function_owner_role',c.oid,'UPDATE')
   OR has_table_privilege('pay54_paytag_function_owner_role',c.oid,'DELETE')
   OR has_table_privilege('pay54_paytag_register_role',c.oid,'INSERT')
   OR has_table_privilege('pay54_paytag_register_role',c.oid,'UPDATE')
  )
 ) OR EXISTS (
  SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='pay54'
  AND p.proname IN (
   'reserve_wallet_transfer','capture_reserved_wallet_transfer',
   'release_reserved_wallet_transfer')
  AND (
   has_function_privilege('pay54_paytag_function_owner_role',p.oid,'EXECUTE')
   OR has_function_privilege('pay54_paytag_register_role',p.oid,'EXECUTE')
  )
 ) THEN RAISE EXCEPTION 'PAY54_PAYTAG_PR61_FINANCIAL_AUTHORITY_DENIED'; END IF;

 FOR obj IN
  SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='pay54' AND c.relname IN (
    'auth_sessions','account_contexts','account_memberships',
    'personal_wallet_bindings','paytag_registry','paytag_registry_audit',
    'paytag_registration_requests')
 LOOP
  IF NOT obj.relrowsecurity OR NOT obj.relforcerowsecurity
   THEN RAISE EXCEPTION 'PAY54_PAYTAG_PR61_RLS_DISABLED: %',obj.relname; END IF;
 END LOOP;
 IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='pay54' AND c.relname IN (
    'auth_sessions','account_contexts','account_memberships',
    'personal_wallet_bindings','paytag_registry','paytag_registry_audit',
    'paytag_registration_requests'))<>7
 THEN RAISE EXCEPTION 'PAY54_PAYTAG_PR61_RLS_RELATION_MISSING'; END IF;

 RAISE NOTICE 'PASS: PayTag restricted role remains isolated; no deployment evidence supplied';
END
$check$;
ROLLBACK;
