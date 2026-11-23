-- PAY54 Batch34: disposable ACL, RLS and inert authority proofs.
\set ON_ERROR_STOP on
DO $check$
DECLARE owner_oid oid; caller_oid oid;
BEGIN
 SELECT oid INTO owner_oid FROM pg_roles WHERE rolname='pay54_wallet_read_owner_role'
  AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolinherit;
 SELECT oid INTO caller_oid FROM pg_roles WHERE rolname='pay54_wallet_read_caller_role'
  AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolinherit;
 IF owner_oid IS NULL OR caller_oid IS NULL
 OR EXISTS(SELECT 1 FROM pg_auth_members
    WHERE roleid IN (owner_oid,caller_oid) OR member IN (owner_oid,caller_oid))
 OR EXISTS(SELECT 1 FROM pg_class WHERE oid IN
  ('pay54.auth_sessions'::regclass,'pay54.account_contexts'::regclass,
  'pay54.account_memberships'::regclass,
  'pay54.personal_wallet_bindings'::regclass)
 AND (NOT relrowsecurity OR NOT relforcerowsecurity))
 OR has_function_privilege('pay54_wallet_read_caller_role',
   'pay54.wallet_read_authority_status()','EXECUTE')
 OR has_table_privilege('pay54_wallet_read_caller_role',
   'pay54.ledger_entries','SELECT')
 OR has_table_privilege('pay54_wallet_read_owner_role',
   'pay54.balance_reservations','SELECT')
 THEN RAISE EXCEPTION 'PAY54_WALLET_READ_AUTHORITY_CATALOGUE_DENIED'; END IF;
END $check$;

BEGIN;
SET LOCAL ROLE pay54_wallet_read_caller_role;
DO $guard$
DECLARE rejected boolean:=false;
BEGIN
 BEGIN
  PERFORM * FROM pay54.auth_sessions LIMIT 1;
 EXCEPTION WHEN insufficient_privilege THEN rejected:=true;
 END;
 IF NOT rejected THEN
  RAISE EXCEPTION 'PAY54_UNAUTHORISED_DIRECT_SESSION_READ_ALLOWED';
 END IF;
 rejected:=false;
 BEGIN
  PERFORM * FROM pay54.ledger_entries LIMIT 1;
 EXCEPTION WHEN insufficient_privilege THEN rejected:=true;
 END;
 IF NOT rejected THEN
  RAISE EXCEPTION 'PAY54_UNAUTHORISED_LEDGER_READ_ALLOWED';
 END IF;
 rejected:=false;
 BEGIN
  PERFORM * FROM pay54.wallet_read_authority_status();
 EXCEPTION WHEN insufficient_privilege THEN rejected:=true;
 END;
 IF NOT rejected THEN
  RAISE EXCEPTION 'PAY54_UNAUTHORISED_STATUS_ENTRYPOINT_ALLOWED';
 END IF;
END $guard$;
ROLLBACK;

SELECT 1/(CASE WHEN current_user='postgres' THEN 1 ELSE 0 END)
 AS role_reset_on_rollback;
