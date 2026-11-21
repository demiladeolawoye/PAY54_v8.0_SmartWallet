-- PAY54 CR-PAYTAG-01 P2B-B2B5: execution authority boundary preflight.
-- Disposable PostgreSQL 16+ ONLY, after migrations 001-026.
-- No DDL or privileges. Detects prohibited accidental execution enablement.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';

DO $pay54_gate$
DECLARE
  v_role oid;
  v_writer oid;
  v_target oid;
  v_name text;
BEGIN
  SELECT oid INTO STRICT v_role FROM pg_roles
  WHERE rolname='pay54_paytag_register_role';
  SELECT oid INTO v_writer FROM pg_proc
  WHERE oid=to_regprocedure(
   'pay54.register_paytag_trusted(bytea,bytea,uuid,bigint,uuid,uuid,text,bytea,bytea,uuid,uuid)');
  IF v_writer IS NULL OR NOT EXISTS (
     SELECT 1 FROM pg_proc WHERE oid=v_writer AND NOT prosecdef
  ) THEN
     RAISE EXCEPTION 'PAY54_PAYTAG_WRITER_POSTURE_CHANGED';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_roles
    WHERE oid=v_role AND
      (rolcanlogin OR rolinherit OR rolsuper OR rolbypassrls OR
       rolcreatedb OR rolcreaterole OR rolreplication)
  ) OR EXISTS (
    SELECT 1 FROM pg_auth_members WHERE roleid=v_role OR member=v_role
  ) THEN RAISE EXCEPTION 'PAY54_PAYTAG_ROLE_ESCALATION_DETECTED'; END IF;
  IF has_schema_privilege('pay54_paytag_register_role','pay54','USAGE')
     OR has_schema_privilege('pay54_paytag_register_role','pay54','CREATE')
     OR has_function_privilege('pay54_paytag_register_role',v_writer,'EXECUTE')
     OR EXISTS (SELECT 1 FROM pg_proc p, LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) acl
                WHERE p.oid=v_writer AND acl.grantee=0 AND acl.privilege_type='EXECUTE')
  THEN RAISE EXCEPTION 'PAY54_PAYTAG_EXECUTION_GRANT_PREMATURE'; END IF;

  -- Scan all tables, views, foreign tables and materialized views, not just
  -- a hard-coded list of known identities. Restricted role must own none.
  FOR v_target,v_name IN
    SELECT c.oid, n.nspname||'.'||c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='pay54' AND c.relkind IN ('r','p','v','m','f')
  LOOP
    IF has_table_privilege('pay54_paytag_register_role',v_target,'SELECT') OR
       has_table_privilege('pay54_paytag_register_role',v_target,'INSERT') OR
       has_table_privilege('pay54_paytag_register_role',v_target,'UPDATE') OR
       has_table_privilege('pay54_paytag_register_role',v_target,'DELETE') OR
       has_table_privilege('pay54_paytag_register_role',v_target,'TRUNCATE') OR
       has_table_privilege('pay54_paytag_register_role',v_target,'REFERENCES') OR
       has_table_privilege('pay54_paytag_register_role',v_target,'TRIGGER')
    THEN
      RAISE EXCEPTION 'PAY54_PAYTAG_DIRECT_TABLE_GRANT_DETECTED: %',v_name;
    END IF;
  END LOOP;
  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relowner=v_role
  ) OR EXISTS (
    SELECT 1 FROM pg_proc WHERE proowner=v_role
  ) OR EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspowner=v_role
  ) OR EXISTS (
    SELECT 1 FROM pg_policy WHERE polroles @> ARRAY[v_role]
  ) THEN
    RAISE EXCEPTION 'PAY54_PAYTAG_ROLE_OWNERSHIP_OR_POLICY_DETECTED';
  END IF;

  -- Four sensitive PayTag tables must retain FORCE RLS, and no policies
  -- may be created before the independently-reviewed authority migration.
  FOR v_target,v_name IN
    SELECT c.oid,n.nspname||'.'||c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='pay54' AND c.relname IN
      ('paytag_registry','paytag_registry_audit',
       'paytag_registration_requests','auth_sessions')
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class WHERE oid=v_target AND
        (NOT relrowsecurity OR NOT relforcerowsecurity)
    ) OR EXISTS (
      SELECT 1 FROM pg_policy WHERE polrelid=v_target
        AND v_name LIKE 'pay54.paytag_%'
    ) THEN
      RAISE EXCEPTION 'PAY54_PAYTAG_FORCED_RLS_OR_POLICY_BREACH: %',v_name;
    END IF;
  END LOOP;
  IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n
       ON n.oid=c.relnamespace WHERE n.nspname='pay54'
       AND c.relname IN ('paytag_registry','paytag_registry_audit',
        'paytag_registration_requests','auth_sessions'))<>4
  THEN RAISE EXCEPTION 'PAY54_PAYTAG_REQUIRED_TABLE_MISSING'; END IF;

  IF has_function_privilege('pay54_financial_app_role',v_writer,'EXECUTE')
     OR has_function_privilege('pay54_ledger_executor_role',v_writer,'EXECUTE')
  THEN RAISE EXCEPTION 'PAY54_PAYTAG_WRITER_FINANCIAL_ROLE_LEAK'; END IF;
  RAISE NOTICE 'PASS: PayTag execution authority remains disabled';
END
$pay54_gate$;
ROLLBACK;
