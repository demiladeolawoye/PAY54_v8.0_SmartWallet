-- PAY54 Batch 22 / 853 — protect historical deny-only account reader.
-- Canonical migration 013 must remain restrictive after additive migration 017.
\set ON_ERROR_STOP on

SELECT 1/(CASE WHEN count(*)=2 THEN 1 ELSE 0 END)
 AS restrictive_legacy_policies_preserved
FROM pg_policies
WHERE schemaname='pay54'
  AND permissive='RESTRICTIVE'
  AND (
    (tablename='account_contexts' AND policyname='pay54_reader_account_deny')
    OR
    (tablename='account_memberships' AND policyname='pay54_reader_membership_deny')
  );

SELECT 1/(CASE WHEN
  NOT has_table_privilege('pay54_account_reader_role',
    'pay54.account_contexts','SELECT')
  AND NOT has_table_privilege('pay54_account_reader_role',
    'pay54.account_memberships','SELECT')
THEN 1 ELSE 0 END) AS legacy_reader_still_unprivileged;

SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END)
 AS new_directory_role_is_distinct
FROM pg_roles
WHERE rolname='pay54_account_directory_read_role'
  AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls;
