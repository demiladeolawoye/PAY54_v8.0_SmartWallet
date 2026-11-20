-- PAY54 P2B-B2B4: role boundary negatives (disposable database only).
\set ON_ERROR_STOP on
BEGIN;
DO $assert$
DECLARE v_role oid;
BEGIN
 SELECT oid INTO v_role FROM pg_roles
 WHERE rolname='pay54_paytag_register_role'
  AND NOT rolcanlogin AND NOT rolinherit AND NOT rolsuper
  AND NOT rolbypassrls AND NOT rolcreatedb AND NOT rolcreaterole
  AND NOT rolreplication;
 IF v_role IS NULL OR
    EXISTS (SELECT 1 FROM pg_auth_members
            WHERE roleid=v_role OR member=v_role) OR
    has_schema_privilege('pay54_paytag_register_role','pay54','USAGE') OR
    has_function_privilege('pay54_paytag_register_role',
      'pay54.register_paytag_trusted(bytea,bytea,uuid,bigint,uuid,uuid,text,bytea,bytea,uuid,uuid)',
      'EXECUTE') OR
    has_table_privilege('pay54_paytag_register_role',
      'pay54.auth_sessions','SELECT') OR
    has_table_privilege('pay54_paytag_register_role',
      'pay54.account_contexts','SELECT') OR
    has_table_privilege('pay54_paytag_register_role',
      'pay54.account_memberships','SELECT') OR
    has_table_privilege('pay54_paytag_register_role',
      'pay54.personal_wallet_bindings','SELECT') OR
    has_table_privilege('pay54_paytag_register_role',
      'pay54.paytag_registry','INSERT') OR
    has_table_privilege('pay54_paytag_register_role',
      'pay54.paytag_registry_audit','INSERT') OR
    has_table_privilege('pay54_paytag_register_role',
      'pay54.paytag_registration_requests','UPDATE') OR
    has_table_privilege('pay54_paytag_register_role',
      'pay54.ledger_entries','INSERT')
 THEN RAISE EXCEPTION 'PAYTAG_INERT_ROLE_HAS_AUTHORITY'; END IF;
 IF EXISTS (
   SELECT 1 FROM pg_policy WHERE polroles @> ARRAY[v_role]
 )
 THEN RAISE EXCEPTION 'PAYTAG_INERT_ROLE_UNEXPECTED_RLS_POLICY'; END IF;
END
$assert$;
ROLLBACK;

-- Even with an attempted SET ROLE in a superuser-owned disposable session,
-- the actual trusted writer must not be callable by the inert role.
BEGIN;
SET LOCAL ROLE pay54_paytag_register_role;
DO $assert$
DECLARE denied boolean := FALSE;
BEGIN
 BEGIN
   PERFORM * FROM pay54.register_paytag_trusted(
     decode(repeat('11',32),'hex'),decode(repeat('22',32),'hex'),
     '11111111-1111-4111-8111-111111111111',1,
     '22222222-2222-4222-8222-222222222222',
     '22222222-2222-4222-8222-222222222222','safe_alias',
     decode(repeat('33',32),'hex'),decode(repeat('44',32),'hex'),
     '33333333-3333-4333-8333-333333333333',
     '44444444-4444-4444-8444-444444444444');
 EXCEPTION WHEN insufficient_privilege THEN
   denied := TRUE;
 END;
 IF NOT denied THEN
   RAISE EXCEPTION 'PAYTAG_INERT_ROLE_EXECUTION_MUST_BE_DENIED';
 END IF;
END
$assert$;
ROLLBACK;
