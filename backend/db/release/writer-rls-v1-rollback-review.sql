-- PAY54 Wave9 — paired review-only RLS candidate rollback.
-- Disposable only; do not silently alter Wallet38 reader policies.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='25s';
DO $pre$
BEGIN
 IF current_database()<>'pay54_disposable_ci' OR session_user<>'postgres'
 OR current_user<>'postgres'
 OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='pay54_writer9_owner_candidate')
 OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='pay54_writer9_caller_candidate')
 OR (SELECT count(*) FROM pg_policies WHERE schemaname='pay54'
 AND policyname LIKE 'pay54_w9_deny_%')<>5
 THEN RAISE EXCEPTION 'PAY54_W9_ROLLBACK_PRECONDITION_FAILED'; END IF;
 IF EXISTS (SELECT 1 FROM pg_auth_members m
 JOIN pg_roles r ON r.oid=m.member OR r.oid=m.roleid
 WHERE r.rolname IN ('pay54_writer9_owner_candidate','pay54_writer9_caller_candidate'))
 THEN RAISE EXCEPTION 'PAY54_W9_ROLE_MEMBERSHIP_DRIFT'; END IF;
END $pre$;
DROP POLICY pay54_w9_deny_wallets ON pay54.wallets;
DROP POLICY pay54_w9_deny_accounts ON pay54.ledger_accounts;
DROP POLICY pay54_w9_deny_entries ON pay54.ledger_entries;
DROP POLICY pay54_w9_deny_journals ON pay54.ledger_journals;
DROP POLICY pay54_w9_deny_holds ON pay54.balance_reservations;
DROP ROLE pay54_writer9_caller_candidate;
DROP ROLE pay54_writer9_owner_candidate;
DO $post$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN
 ('pay54_writer9_owner_candidate','pay54_writer9_caller_candidate'))
 OR EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='pay54'
 AND policyname LIKE 'pay54_w9_deny_%')
 OR (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='pay54'
 AND c.relname IN ('wallets','ledger_accounts','ledger_entries','ledger_journals','balance_reservations')
 AND c.relrowsecurity AND c.relforcerowsecurity)<>5
 OR to_regprocedure('pay54.wallet_read_restricted_v1(bytea,uuid,uuid,character varying)') IS NULL
 OR (SELECT count(*) FROM pg_policies WHERE policyname IN
 ('pay54_wallet38_wallet','pay54_wallet38_ledger_account',
 'pay54_wallet38_entries','pay54_wallet38_journal','pay54_wallet38_holds'))<>5
 THEN RAISE EXCEPTION 'PAY54_W9_ROLLBACK_SECURITY_DRIFT'; END IF;
END $post$;
COMMIT;
\echo PAY54_W9_ROLLBACK_DENY_ONLY_PASS
