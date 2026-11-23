-- PAY54 Batch36 — READ-ONLY release preflight, not a database migration.
-- Safe for a controlled DBA preflight. Never provisions or grants access.
-- Intentional NO-GO: current wallet-read execution exists only in disposable tests.
BEGIN READ ONLY;
SET LOCAL statement_timeout='10s';
DO $wallet_stage_gate$
DECLARE
 owner_role oid;
 caller_role oid;
BEGIN
 SELECT oid INTO owner_role FROM pg_roles
 WHERE rolname='pay54_wallet_read_owner_role'
 AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls;
 SELECT oid INTO caller_role FROM pg_roles
 WHERE rolname='pay54_wallet_read_caller_role'
 AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls;

 IF owner_role IS NULL OR caller_role IS NULL
 OR EXISTS(SELECT 1 FROM pg_auth_members
    WHERE roleid IN (owner_role,caller_role)
       OR member IN (owner_role,caller_role))
 OR EXISTS(SELECT 1 FROM pg_class WHERE oid IN
   ('pay54.auth_sessions'::regclass,
    'pay54.account_contexts'::regclass,
    'pay54.account_memberships'::regclass,
    'pay54.personal_wallet_bindings'::regclass)
   AND (NOT relrowsecurity OR NOT relforcerowsecurity))
 OR has_table_privilege('pay54_wallet_read_caller_role',
    'pay54.ledger_entries','SELECT')
 OR has_table_privilege('pay54_wallet_read_caller_role',
    'pay54.balance_reservations','SELECT')
 OR has_function_privilege('pay54_wallet_read_caller_role',
    'pay54.wallet_read_authority_status()','EXECUTE')
 THEN
   RAISE EXCEPTION 'PAY54_STAGE_WALLET_ROLE_POSTURE_UNVERIFIED';
 END IF;
END $wallet_stage_gate$;
SELECT
 false AS staging_deployment_authorised,
 false AS customer_available_balance_verified,
 false AS persistent_wallet_reader_installed,
 'SOURCE_ONLY_PENDING_DBA_RELEASE'::text AS disposition;
ROLLBACK;
