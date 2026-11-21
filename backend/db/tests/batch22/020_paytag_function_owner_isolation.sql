-- PAY54 CR-PAYTAG-01 / disposable PostgreSQL identity separation proof.
\set ON_ERROR_STOP on
BEGIN;
DO $assert$
DECLARE v_owner oid; v_caller oid; v_writer oid;
BEGIN
  SELECT oid INTO v_owner FROM pg_roles WHERE rolname='pay54_paytag_function_owner_role'
    AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolinherit;
  SELECT oid INTO v_caller FROM pg_roles WHERE rolname='pay54_paytag_register_role'
    AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls;
  v_writer:=to_regprocedure(
    'pay54.register_paytag_trusted(bytea,bytea,uuid,bigint,uuid,uuid,text,bytea,bytea,uuid,uuid)');
  IF v_owner IS NULL OR v_caller IS NULL OR v_owner=v_caller OR v_writer IS NULL
    OR EXISTS (SELECT 1 FROM pg_auth_members WHERE roleid IN (v_owner,v_caller)
       OR member IN (v_owner,v_caller))
    OR EXISTS (SELECT 1 FROM pg_proc WHERE oid=v_writer
        AND (proowner=v_owner OR prosecdef))
    OR EXISTS (SELECT 1 FROM pg_class WHERE relowner=v_owner)
    OR EXISTS (SELECT 1 FROM pg_proc WHERE proowner=v_owner)
    OR EXISTS (SELECT 1 FROM pg_namespace WHERE nspowner=v_owner)
    OR has_schema_privilege('pay54_paytag_function_owner_role','pay54','USAGE')
    OR has_function_privilege('pay54_paytag_function_owner_role',v_writer,'EXECUTE')
    OR has_function_privilege('pay54_paytag_register_role',v_writer,'EXECUTE')
  THEN RAISE EXCEPTION 'PAYTAG_FUNCTION_OWNER_ISOLATION_FAILURE'; END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='pay54' AND c.relkind IN ('r','p','v','m','f')
      AND (
        has_table_privilege('pay54_paytag_function_owner_role',c.oid,'SELECT')
        OR has_table_privilege('pay54_paytag_function_owner_role',c.oid,'INSERT')
        OR has_table_privilege('pay54_paytag_function_owner_role',c.oid,'UPDATE')
        OR has_table_privilege('pay54_paytag_function_owner_role',c.oid,'DELETE')
        OR has_table_privilege('pay54_paytag_function_owner_role',c.oid,'TRUNCATE')
        OR has_table_privilege('pay54_paytag_function_owner_role',c.oid,'REFERENCES')
        OR has_table_privilege('pay54_paytag_function_owner_role',c.oid,'TRIGGER')
      )
  ) THEN RAISE EXCEPTION 'PAYTAG_FUNCTION_OWNER_DIRECT_TABLE_ACCESS'; END IF;
  IF EXISTS (SELECT 1 FROM pg_policy
     WHERE polroles @> ARRAY[v_owner]) THEN
    RAISE EXCEPTION 'PAYTAG_FUNCTION_OWNER_PREMATURE_RLS_POLICY';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p
    WHERE p.pronamespace='pay54'::regnamespace
      AND p.proowner=v_owner) THEN
    RAISE EXCEPTION 'PAYTAG_FUNCTION_OWNER_PREMATURE_FUNCTION_TRANSFER';
  END IF;
END
$assert$;
ROLLBACK;

-- Check with actual role switch in disposable CI: no schema usage and
-- no callable registration function. Permission denial, never success.
BEGIN;
SET LOCAL ROLE pay54_paytag_function_owner_role;
DO $assert$
DECLARE denied boolean:=FALSE;
BEGIN
 BEGIN
  PERFORM * FROM pay54.register_paytag_trusted(
   decode(repeat('11',32),'hex'),decode(repeat('22',32),'hex'),
   '11111111-1111-4111-8111-111111111111',1,
   '22222222-2222-4222-8222-222222222222',
   '22222222-2222-4222-8222-222222222222','paytag_denied',
   decode(repeat('33',32),'hex'),decode(repeat('44',32),'hex'),
   '33333333-3333-4333-8333-333333333333',
   '44444444-4444-4444-8444-444444444444');
 EXCEPTION WHEN insufficient_privilege THEN denied:=TRUE;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'PAYTAG_FUNCTION_OWNER_EXECUTED_PREMATURELY'; END IF;
END
$assert$;
ROLLBACK;
