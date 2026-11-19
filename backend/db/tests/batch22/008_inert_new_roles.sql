-- PAY54 Batch 22 / 854 — no customer login or role membership activation.
\set ON_ERROR_STOP on

SELECT 1/(CASE WHEN count(*)=3 THEN 1 ELSE 0 END)
 AS all_new_roles_are_nonlogin_and_no_bypass
FROM pg_roles
WHERE rolname IN (
 'pay54_session_read_role',
 'pay54_account_directory_read_role',
 'pay54_context_audit_insert_role'
) AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls
  AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication
  AND NOT rolinherit;

SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END)
 AS no_runtime_role_memberships
FROM pg_auth_members
WHERE roleid IN (
 SELECT oid FROM pg_roles WHERE rolname IN (
  'pay54_session_read_role',
  'pay54_account_directory_read_role',
  'pay54_context_audit_insert_role'
));

SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END)
 AS no_new_role_owns_pay54_objects
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='pay54' AND c.relowner IN (
 SELECT oid FROM pg_roles WHERE rolname IN (
  'pay54_session_read_role',
  'pay54_account_directory_read_role',
  'pay54_context_audit_insert_role'
 ));
