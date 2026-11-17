-- PAY54 Batch 23 / 892 — function-only caller and isolated executor.
\set ON_ERROR_STOP on

SELECT 1/(CASE WHEN count(*)=2 THEN 1 ELSE 0 END)
 AS two_unassigned_no_bypass_session_roles
FROM pg_roles
WHERE rolname IN (
 'pay54_session_rotate_role',
 'pay54_session_rotate_executor_role'
)
AND NOT rolcanlogin AND NOT rolinherit AND NOT rolsuper
AND NOT rolbypassrls AND NOT rolcreatedb AND NOT rolcreaterole
AND NOT rolreplication;

SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END)
 AS no_function_role_memberships
FROM pg_auth_members
WHERE roleid IN (
 SELECT oid FROM pg_roles WHERE rolname IN (
  'pay54_session_rotate_role','pay54_session_rotate_executor_role'
 ))
 OR member IN (
 SELECT oid FROM pg_roles WHERE rolname IN (
  'pay54_session_rotate_role','pay54_session_rotate_executor_role'
 ));

-- Caller has EXECUTE only: no direct SELECT/INSERT/UPDATE/DELETE anywhere.
DO $$
DECLARE table_name text;
DECLARE privilege_name text;
BEGIN
 FOR table_name IN SELECT unnest(ARRAY[
  'pay54.auth_sessions',
  'pay54.account_contexts',
  'pay54.account_memberships',
  'pay54.account_context_audit',
  'pay54.ledger_entries',
  'pay54.financial_operations',
  'pay54.wallets'
 ]) LOOP
  FOR privilege_name IN SELECT unnest(ARRAY[
   'SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'
  ]) LOOP
   IF has_table_privilege('pay54_session_rotate_role',
                          table_name,privilege_name)
   THEN RAISE EXCEPTION 'PAY54_ROTATE_CALLER_DIRECT_TABLE_PRIVILEGE_%_%',
         table_name,privilege_name; END IF;
  END LOOP;
 END LOOP;
END $$;

-- The restricted executor has only the minimum row privileges for function
-- internal operations, and zero ledger or financial execution capabilities.
SELECT 1/(CASE WHEN
  has_table_privilege('pay54_session_rotate_executor_role',
      'pay54.auth_sessions','SELECT')
  AND has_table_privilege('pay54_session_rotate_executor_role',
      'pay54.auth_sessions','INSERT')
  AND has_table_privilege('pay54_session_rotate_executor_role',
      'pay54.auth_sessions','UPDATE')
  AND NOT has_table_privilege('pay54_session_rotate_executor_role',
      'pay54.auth_sessions','DELETE')
  AND has_table_privilege('pay54_session_rotate_executor_role',
      'pay54.account_context_audit','INSERT')
  AND NOT has_table_privilege('pay54_session_rotate_executor_role',
      'pay54.account_context_audit','UPDATE')
  AND NOT has_table_privilege('pay54_session_rotate_executor_role',
      'pay54.ledger_entries','INSERT')
  AND NOT has_table_privilege('pay54_session_rotate_executor_role',
      'pay54.ledger_entries','UPDATE')
  AND NOT has_table_privilege('pay54_session_rotate_executor_role',
      'pay54.financial_operations','INSERT')
  AND NOT has_table_privilege('pay54_session_rotate_executor_role',
      'pay54.financial_operations','UPDATE')
  AND NOT has_schema_privilege('pay54_session_rotate_executor_role',
      'pay54','CREATE')
THEN 1 ELSE 0 END) AS restricted_executor_exact_privileges;

-- SECURITY DEFINER must be owned by the restricted executor, not postgres.
SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END)
 AS function_definer_is_unprivileged_no_bypass_role
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
JOIN pg_roles r ON r.oid=p.proowner
WHERE n.nspname='pay54'
  AND p.proname='rotate_account_context_session'
  AND p.prosecdef=true
  AND r.rolname='pay54_session_rotate_executor_role'
  AND NOT r.rolsuper AND NOT r.rolbypassrls;

SELECT 1/(CASE WHEN
  has_function_privilege('pay54_session_rotate_role',
   'pay54.rotate_account_context_session(bytea,bytea,uuid,bytea,bytea,uuid,bigint,uuid,uuid,timestamptz)',
   'EXECUTE')
  AND NOT has_function_privilege('pay54_account_reader_role',
   'pay54.rotate_account_context_session(bytea,bytea,uuid,bytea,bytea,uuid,bigint,uuid,uuid,timestamptz)',
   'EXECUTE')
  AND NOT has_function_privilege('pay54_session_read_role',
   'pay54.rotate_account_context_session(bytea,bytea,uuid,bytea,bytea,uuid,bigint,uuid,uuid,timestamptz)',
   'EXECUTE')
THEN 1 ELSE 0 END) AS only_approved_function_caller;
