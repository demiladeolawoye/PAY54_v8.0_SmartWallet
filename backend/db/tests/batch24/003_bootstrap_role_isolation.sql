-- PAY54 Batch 24 / 925 — function-only staging bootstrap caller.
\set ON_ERROR_STOP on
SELECT 1/(CASE WHEN count(*)=2 THEN 1 ELSE 0 END) AS issue_roles_are_nonlogin
FROM pg_roles
WHERE rolname IN ('pay54_session_issue_role','pay54_session_issue_executor_role')
 AND NOT rolcanlogin AND NOT rolinherit AND NOT rolsuper
 AND NOT rolbypassrls AND NOT rolcreatedb AND NOT rolcreaterole;
SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END)
 AS issuer_role_memberships_not_provisioned
FROM pg_auth_members
WHERE roleid IN (SELECT oid FROM pg_roles WHERE rolname IN (
 'pay54_session_issue_role','pay54_session_issue_executor_role'))
 OR member IN (SELECT oid FROM pg_roles WHERE rolname IN (
 'pay54_session_issue_role','pay54_session_issue_executor_role'));

DO $$
DECLARE table_name text;privilege text;
BEGIN
 FOREACH table_name IN ARRAY ARRAY[
  'pay54.identity_assertion_receipts',
  'pay54.auth_sessions','pay54.account_contexts',
  'pay54.account_memberships','pay54.ledger_entries',
  'pay54.financial_operations','pay54.wallets'
 ] LOOP
  FOREACH privilege IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
   IF has_table_privilege('pay54_session_issue_role',table_name,privilege)
    THEN RAISE EXCEPTION 'PAY54_BOOTSTRAP_CALLER_DIRECT_TABLE_ACCESS_%_%',
       table_name,privilege;
   END IF;
  END LOOP;
 END LOOP;
END $$;

SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END)
 AS issuer_function_owned_by_restricted_executor
FROM pg_proc p JOIN pg_roles r ON r.oid=p.proowner
WHERE p.proname='consume_identity_assertion_and_issue_bootstrap'
 AND p.pronamespace='pay54'::regnamespace
 AND p.prosecdef AND r.rolname='pay54_session_issue_executor_role'
 AND NOT r.rolsuper AND NOT r.rolbypassrls;

SELECT 1/(CASE WHEN
 has_function_privilege('pay54_session_issue_role',
  'pay54.consume_identity_assertion_and_issue_bootstrap(text,uuid,uuid,timestamptz,uuid,bytea,bytea)',
  'EXECUTE')
 AND NOT has_function_privilege('pay54_session_read_role',
  'pay54.consume_identity_assertion_and_issue_bootstrap(text,uuid,uuid,timestamptz,uuid,bytea,bytea)',
  'EXECUTE')
 AND NOT has_function_privilege('pay54_session_rotate_role',
  'pay54.consume_identity_assertion_and_issue_bootstrap(text,uuid,uuid,timestamptz,uuid,bytea,bytea)',
  'EXECUTE')
THEN 1 ELSE 0 END) AS issuance_is_not_exposed_to_session_read_or_rotation_roles;
