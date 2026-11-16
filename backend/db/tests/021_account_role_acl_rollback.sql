-- PAY54 Batch 09 — prove test roles and temporary grants never survive.
\set ON_ERROR_STOP on
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN
  ('pay54_ci_actor_alpha','pay54_ci_actor_beta',
   'pay54_ci_actor_attack','pay54_ci_actor_target')) THEN
  RAISE EXCEPTION 'Disposable tenant actor role survived'; END IF;
 IF to_regclass('pay54_ci_batch09.protected_account') IS NOT NULL OR
    to_regclass('pay54_ci_attack.protected') IS NOT NULL THEN
  RAISE EXCEPTION 'Disposable test-only tenant relation survived'; END IF;
 IF has_table_privilege('pay54_account_reader_role','pay54.account_contexts','SELECT')
    OR has_table_privilege('pay54_account_reader_role','pay54.account_memberships','SELECT')
    OR has_table_privilege('pay54_account_reader_role','pay54.wallets','SELECT') THEN
  RAISE EXCEPTION 'PAY54 denied reader acquired customer access'; END IF;
 IF EXISTS(SELECT 1 FROM pg_auth_members WHERE
  roleid=(SELECT oid FROM pg_roles WHERE rolname='pay54_account_reader_role')
  OR member=(SELECT oid FROM pg_roles WHERE rolname='pay54_account_reader_role')) THEN
  RAISE EXCEPTION 'PAY54 dormant role acquired membership'; END IF;
 RAISE NOTICE 'PASS: no persistent customer grants or test tenant artefacts';
END $$;
