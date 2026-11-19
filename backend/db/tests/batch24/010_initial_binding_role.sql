-- PAY54 Batch 24 / 937 — first-binding caller remains function-only.
\set ON_ERROR_STOP on
SELECT 1/(CASE WHEN
 has_function_privilege('pay54_session_rotate_role',
  'pay54.bind_initial_account_session(bytea,bytea,uuid,bytea,bytea,uuid,bigint,uuid,uuid,timestamptz)',
  'EXECUTE')
 AND NOT has_function_privilege('pay54_session_issue_role',
  'pay54.bind_initial_account_session(bytea,bytea,uuid,bytea,bytea,uuid,bigint,uuid,uuid,timestamptz)',
  'EXECUTE')
 AND NOT has_function_privilege('pay54_session_read_role',
  'pay54.bind_initial_account_session(bytea,bytea,uuid,bytea,bytea,uuid,bigint,uuid,uuid,timestamptz)',
  'EXECUTE')
THEN 1 ELSE 0 END) AS initial_bind_uses_only_rotation_callable_role;

SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END)
 AS initial_bind_has_restricted_definer
FROM pg_proc p JOIN pg_roles r ON r.oid=p.proowner
WHERE p.pronamespace='pay54'::regnamespace
 AND p.proname='bind_initial_account_session'
 AND p.prosecdef
 AND r.rolname='pay54_session_rotate_executor_role'
 AND NOT r.rolsuper AND NOT r.rolbypassrls AND NOT r.rolcanlogin;

SELECT 1/(CASE WHEN NOT has_schema_privilege(
 'pay54_session_rotate_executor_role','pay54','CREATE')
 THEN 1 ELSE 0 END) AS definer_cannot_create_objects_after_migration;
