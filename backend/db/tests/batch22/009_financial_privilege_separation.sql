-- PAY54 Batch 22 / 855 — new roles cannot read or alter ledger funds.
\set ON_ERROR_STOP on
DO $$
DECLARE role_name text;
DECLARE table_name text;
DECLARE privilege_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY[
    'pay54_session_read_role',
    'pay54_account_directory_read_role',
    'pay54_context_audit_insert_role'
  ] LOOP
    FOREACH table_name IN ARRAY ARRAY[
      'pay54.wallets', 'pay54.ledger_accounts',
      'pay54.ledger_entries', 'pay54.financial_operations'
    ] LOOP
      FOREACH privilege_name IN ARRAY ARRAY[
        'SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'
      ] LOOP
        IF has_table_privilege(role_name, table_name, privilege_name) THEN
          RAISE EXCEPTION 'PAY54_UNAPPROVED_FINANCIAL_PRIVILEGE_%_%_%',
            role_name,table_name,privilege_name;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

SELECT 1/(CASE WHEN
  NOT has_table_privilege('pay54_session_read_role',
      'pay54.account_contexts','SELECT')
  AND NOT has_table_privilege('pay54_session_read_role',
      'pay54.account_memberships','SELECT')
  AND NOT has_table_privilege('pay54_account_directory_read_role',
      'pay54.auth_sessions','SELECT')
  AND NOT has_table_privilege('pay54_context_audit_insert_role',
      'pay54.auth_sessions','SELECT')
THEN 1 ELSE 0 END) AS separation_of_session_account_audit_roles;
