-- PAY54 Wave10 tenant shadow rollback — disposable only.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='25s';
DO $pre$
BEGIN
 IF current_database()<>'pay54_disposable_ci' OR session_user<>'postgres'
 OR current_user<>'postgres'
 OR (SELECT count(*) FROM pg_policies WHERE schemaname='pay54'
     AND policyname LIKE 'pay54_w10_scope_%')<>5
 OR (SELECT count(*) FROM pg_policies WHERE schemaname='pay54'
     AND policyname LIKE 'pay54_w9_deny_%' AND permissive='RESTRICTIVE')<>5
 THEN RAISE EXCEPTION 'PAY54_W10_SHADOW_ROLLBACK_PRECONDITION'; END IF;
END $pre$;
DROP POLICY pay54_w10_scope_wallet ON pay54.wallets;
DROP POLICY pay54_w10_scope_account ON pay54.ledger_accounts;
DROP POLICY pay54_w10_scope_entry ON pay54.ledger_entries;
DROP POLICY pay54_w10_scope_journal ON pay54.ledger_journals;
DROP POLICY pay54_w10_scope_hold ON pay54.balance_reservations;
DO $post$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='pay54'
   AND policyname LIKE 'pay54_w10_scope_%')
 OR (SELECT count(*) FROM pg_policies WHERE schemaname='pay54'
   AND policyname LIKE 'pay54_w9_deny_%' AND permissive='RESTRICTIVE')<>5
 OR (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='pay54' AND c.relname IN
     ('wallets','ledger_accounts','ledger_entries','ledger_journals','balance_reservations')
      AND c.relrowsecurity AND c.relforcerowsecurity)<>5
 OR to_regprocedure('pay54.wallet_read_restricted_v1(bytea,uuid,uuid,character varying)') IS NULL
 OR has_table_privilege('pay54_writer9_owner_candidate','pay54.ledger_entries','SELECT')
 OR has_function_privilege('pay54_writer9_caller_candidate',
  'pay54.capture_reserved_wallet_transfer(uuid,uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'PAY54_W10_ROLLBACK_SECURITY_DRIFT'; END IF;
END $post$;
COMMIT;
\echo PAY54_W10_SHADOW_POLICY_ROLLBACK_PASS
