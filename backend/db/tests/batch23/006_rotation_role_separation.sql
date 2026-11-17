-- PAY54 Batch 23 / 880 — verify session rotation role remains restricted.
\set ON_ERROR_STOP on
SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END)
 AS NOLOGIN_NOINHERIT_NOBYPASSRLS
FROM pg_roles
WHERE rolname='pay54_session_rotate_role'
  AND NOT rolcanlogin AND NOT rolinherit AND NOT rolsuper
  AND NOT rolbypassrls AND NOT rolcreatedb AND NOT rolcreaterole
  AND NOT rolreplication;

SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END)
 AS no_privilege_role_memberships
FROM pg_auth_members
WHERE roleid=(SELECT oid FROM pg_roles WHERE rolname='pay54_session_rotate_role')
   OR member=(SELECT oid FROM pg_roles WHERE rolname='pay54_session_rotate_role');

SELECT 1/(CASE WHEN
 has_table_privilege('pay54_session_rotate_role','pay54.auth_sessions','SELECT')
 AND has_table_privilege('pay54_session_rotate_role','pay54.auth_sessions','INSERT')
 AND has_table_privilege('pay54_session_rotate_role','pay54.auth_sessions','UPDATE')
 AND NOT has_table_privilege('pay54_session_rotate_role','pay54.auth_sessions','DELETE')
 AND has_table_privilege('pay54_session_rotate_role','pay54.account_context_audit','INSERT')
 AND NOT has_table_privilege('pay54_session_rotate_role','pay54.account_context_audit','UPDATE')
 AND NOT has_table_privilege('pay54_session_rotate_role','pay54.account_context_audit','DELETE')
 AND NOT has_table_privilege('pay54_session_rotate_role','pay54.ledger_entries','INSERT')
 AND NOT has_table_privilege('pay54_session_rotate_role','pay54.ledger_entries','UPDATE')
 AND NOT has_table_privilege('pay54_session_rotate_role','pay54.ledger_entries','DELETE')
 AND NOT has_table_privilege('pay54_session_rotate_role','pay54.financial_operations','INSERT')
 AND NOT has_table_privilege('pay54_session_rotate_role','pay54.financial_operations','UPDATE')
 THEN 1 ELSE 0 END) AS session_role_cannot_touch_money;

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
 THEN 1 ELSE 0 END) AS no_unapproved_rotation_execute;
