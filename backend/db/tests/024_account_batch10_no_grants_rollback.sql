-- PAY54 Batch 10 implementation 238 — rollback and zero customer grant proof.
-- Run AFTER disposable 022 and 023 scripts against ephemeral PostgreSQL.
\set ON_ERROR_STOP on
DO $$
BEGIN
 IF EXISTS (
  SELECT 1 FROM pg_roles
  WHERE rolname IN (
   'pay54_ci_batch10_alpha','pay54_ci_batch10_beta',
   'pay54_ci_batch10_attacker','pay54_ci_batch10_target'
  )
 ) THEN
  RAISE EXCEPTION 'Batch 10 disposable actor role survived rollback';
 END IF;
 IF to_regclass('pay54_ci_batch10.labels') IS NOT NULL
    OR to_regclass('pay54_ci_batch10_spoof.protected') IS NOT NULL THEN
  RAISE EXCEPTION 'Batch 10 disposable tenant data survived rollback';
 END IF;
 IF NOT EXISTS (
  SELECT 1 FROM pg_roles
  WHERE rolname='pay54_account_reader_role'
    AND NOT rolcanlogin
    AND NOT rolbypassrls
    AND NOT rolsuper
 ) THEN
  RAISE EXCEPTION 'PAY54 dormant reader role must remain NOLOGIN';
 END IF;
 IF has_table_privilege(
      'pay54_account_reader_role','pay54.account_contexts','SELECT')
    OR has_table_privilege(
      'pay54_account_reader_role','pay54.account_memberships','SELECT')
    OR has_table_privilege(
      'pay54_account_reader_role','pay54.personal_wallet_bindings','SELECT')
    OR has_table_privilege(
      'pay54_account_reader_role','pay54.wallets','SELECT') THEN
  RAISE EXCEPTION 'Dormant account reader acquired customer SELECT';
 END IF;
 IF EXISTS (
  SELECT 1 FROM pg_auth_members
  WHERE roleid=(SELECT oid FROM pg_roles WHERE rolname='pay54_account_reader_role')
     OR member=(SELECT oid FROM pg_roles WHERE rolname='pay54_account_reader_role')
 ) THEN
  RAISE EXCEPTION 'Dormant account reader acquired role membership';
 END IF;
 RAISE NOTICE 'Batch 10 synthetic role tests rolled back: no customer access';
END
$$;
