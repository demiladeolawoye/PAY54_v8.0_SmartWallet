-- PAY54 Batch38 wallet-read-v1 ROLLBACK CANDIDATE.
-- DBA-only, explicitly scoped. Disable route and drain readers first.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='25s';
DO $pre$
BEGIN
 IF to_regprocedure('pay54.wallet_read_restricted_v1(bytea,uuid,uuid,character varying)') IS NULL
 OR (SELECT pg_get_userbyid(proowner) FROM pg_proc
     WHERE oid='pay54.wallet_read_restricted_v1(bytea,uuid,uuid,character varying)'::regprocedure)
    <> 'pay54_wallet_read_owner_role'
 THEN RAISE EXCEPTION 'PAY54_B38_ROLLBACK_UNRECOGNISED_OWNER'; END IF;
END $pre$;
REVOKE EXECUTE ON FUNCTION pay54.wallet_read_restricted_v1(
 bytea,uuid,uuid,varchar) FROM pay54_wallet_read_caller_role,PUBLIC;
DROP FUNCTION pay54.wallet_read_restricted_v1(bytea,uuid,uuid,varchar);
DROP POLICY pay54_wallet38_holds ON pay54.balance_reservations;
DROP POLICY pay54_wallet38_journal ON pay54.ledger_journals;
DROP POLICY pay54_wallet38_entries ON pay54.ledger_entries;
DROP POLICY pay54_wallet38_ledger_account ON pay54.ledger_accounts;
DROP POLICY pay54_wallet38_wallet ON pay54.wallets;
DROP POLICY pay54_wallet38_binding ON pay54.personal_wallet_bindings;
DROP POLICY pay54_wallet38_membership ON pay54.account_memberships;
DROP POLICY pay54_wallet38_account ON pay54.account_contexts;
DROP POLICY pay54_wallet38_session ON pay54.auth_sessions;
REVOKE SELECT ON
 pay54.auth_sessions,pay54.account_contexts,pay54.account_memberships,
 pay54.personal_wallet_bindings,pay54.wallets,pay54.ledger_accounts,
 pay54.ledger_entries,pay54.ledger_journals,pay54.balance_reservations
 FROM pay54_wallet_read_owner_role;
-- Forward preflight demands finance tables originally had RLS DISABLED.
-- Do not modify original identity-table RLS policy or FORCE settings.
ALTER TABLE pay54.balance_reservations NO FORCE ROW LEVEL SECURITY;
ALTER TABLE pay54.balance_reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE pay54.ledger_journals NO FORCE ROW LEVEL SECURITY;
ALTER TABLE pay54.ledger_journals DISABLE ROW LEVEL SECURITY;
ALTER TABLE pay54.ledger_entries NO FORCE ROW LEVEL SECURITY;
ALTER TABLE pay54.ledger_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE pay54.ledger_accounts NO FORCE ROW LEVEL SECURITY;
ALTER TABLE pay54.ledger_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE pay54.wallets NO FORCE ROW LEVEL SECURITY;
ALTER TABLE pay54.wallets DISABLE ROW LEVEL SECURITY;
DO $post$
BEGIN
 IF to_regprocedure('pay54.wallet_read_restricted_v1(bytea,uuid,uuid,character varying)') IS NOT NULL
 OR has_table_privilege('pay54_wallet_read_owner_role','pay54.ledger_entries','SELECT')
 OR has_table_privilege('pay54_wallet_read_caller_role','pay54.ledger_entries','SELECT')
 OR EXISTS(SELECT 1 FROM pg_policy WHERE polname LIKE 'pay54_wallet38_%')
 THEN RAISE EXCEPTION 'PAY54_B38_ROLLBACK_INCOMPLETE'; END IF;
END $post$;
COMMIT;
