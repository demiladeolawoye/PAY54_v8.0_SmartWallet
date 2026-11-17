-- PAY54 Batch 24 / 952 — no direct DML, no EXECUTE for reader/rotator.
\set ON_ERROR_STOP on
DO $$
DECLARE role_name text;
DECLARE table_name text;
DECLARE operation text;
BEGIN
 FOREACH role_name IN ARRAY ARRAY[
  'pay54_session_issue_role',
  'pay54_session_read_role',
  'pay54_session_rotate_role'
 ] LOOP
  FOREACH table_name IN ARRAY ARRAY[
   'pay54.identity_assertion_receipts',
   'pay54.ledger_entries','pay54.financial_operations'
  ] LOOP
   FOREACH operation IN ARRAY ARRAY[
    'INSERT','UPDATE','DELETE','TRUNCATE','TRIGGER'
   ] LOOP
    IF has_table_privilege(role_name,table_name,operation)
     THEN RAISE EXCEPTION 'PAY54_ISSUE_ROLE_ESCALATION_%_%_%',
       role_name,table_name,operation;
    END IF;
   END LOOP;
  END LOOP;
 END LOOP;
END $$;
SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END)
 AS bootstrap_function_owner_has_no_bypass
FROM pg_proc p JOIN pg_roles r ON r.oid=p.proowner
WHERE p.proname='consume_identity_assertion_and_issue_bootstrap'
 AND p.pronamespace='pay54'::regnamespace
 AND r.rolname='pay54_session_issue_executor_role'
 AND p.prosecdef
 AND NOT r.rolbypassrls AND NOT r.rolsuper AND NOT r.rolcanlogin;
SELECT 1/(CASE WHEN
 NOT has_schema_privilege('pay54_session_issue_executor_role',
  'pay54','CREATE')
THEN 1 ELSE 0 END) AS issuer_definer_cannot_create_future_functions;