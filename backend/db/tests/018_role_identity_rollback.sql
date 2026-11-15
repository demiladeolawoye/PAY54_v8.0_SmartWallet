-- PAY54 Batch 08 / independent no-effect attestation after test-only RLS.
\set ON_ERROR_STOP on
BEGIN;
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname LIKE 'pay54_ci_%') THEN
  RAISE EXCEPTION 'Disposable CI actor role survived rolled-back tests'; END IF;
 IF EXISTS(SELECT 1 FROM pg_namespace WHERE nspname IN ('pay54_ci_tenant','pay54_ci_spoof')) THEN
  RAISE EXCEPTION 'Disposable CI schema survived rolled-back tests'; END IF;
 IF has_table_privilege('pay54_account_reader_role','pay54.account_contexts','SELECT')
 OR has_table_privilege('pay54_account_reader_role','pay54.account_memberships','SELECT')
 OR has_table_privilege('pay54_account_reader_role','pay54.wallets','SELECT') THEN
  RAISE EXCEPTION 'Dormant production account reader acquired SELECT'; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='pay54_account_reader_role'
    AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolinherit)) THEN
  RAISE EXCEPTION 'Dormant account reader role upgraded'; END IF;
 IF EXISTS(SELECT 1 FROM pg_auth_members WHERE
   roleid=(SELECT oid FROM pg_roles WHERE rolname='pay54_account_reader_role')
   OR member=(SELECT oid FROM pg_roles WHERE rolname='pay54_account_reader_role')
 ) THEN RAISE EXCEPTION 'Dormant account reader role gained membership'; END IF;
END;
$$;
ROLLBACK;
