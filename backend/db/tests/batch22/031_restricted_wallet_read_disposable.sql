-- PAY54 Batch35 RESTRICTED DATABASE READ PROOF, DISPOSABLE ONLY.
-- Run only in disposable PostgreSQL after migrations 001-029.
-- ALL grants, policies, function and fixtures roll back on completion.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '25s';

DO $preflight$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='pay54_wallet_read_owner_role'
    AND NOT rolcanlogin AND NOT rolbypassrls AND NOT rolsuper)
 OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='pay54_wallet_read_caller_role'
    AND NOT rolcanlogin AND NOT rolbypassrls AND NOT rolsuper)
 OR to_regprocedure('pay54.wallet_read_restricted_disposable(bytea,uuid,uuid,character varying)') IS NOT NULL
 THEN RAISE EXCEPTION 'PAY54_WALLET_READ_DISPOSABLE_PRECONDITION_DENIED'; END IF;
END $preflight$;

-- Each grant below exists only inside this rollback-only test transaction.
GRANT SELECT ON
 pay54.auth_sessions,pay54.account_contexts,pay54.account_memberships,
 pay54.personal_wallet_bindings,pay54.wallets,pay54.ledger_accounts,
 pay54.ledger_entries,pay54.ledger_journals,pay54.balance_reservations
 TO pay54_wallet_read_owner_role;

-- Identity rows are additionally guarded by actor/session/active account RLS.
CREATE POLICY pay54_wallet35_session ON pay54.auth_sessions
 FOR SELECT TO pay54_wallet_read_owner_role
 USING (
   token_digest=decode(NULLIF(current_setting('pay54.wallet35_token',true),''),'hex')
   AND session_status='ACTIVE' AND revoked_at IS NULL
   AND issued_at<=clock_timestamp() AND expires_at>clock_timestamp()
 );
CREATE POLICY pay54_wallet35_account ON pay54.account_contexts
 FOR SELECT TO pay54_wallet_read_owner_role
 USING (
  id=NULLIF(current_setting('pay54.wallet35_account',true),'')::uuid
  AND legal_owner_subject=NULLIF(current_setting('pay54.wallet35_actor',true),'')::uuid
  AND account_type='PERSONAL' AND status='ACTIVE'
  AND verification_status='VERIFIED'
 );
CREATE POLICY pay54_wallet35_membership ON pay54.account_memberships
 FOR SELECT TO pay54_wallet_read_owner_role
 USING (
  account_id=NULLIF(current_setting('pay54.wallet35_account',true),'')::uuid
  AND principal_subject=NULLIF(current_setting('pay54.wallet35_actor',true),'')::uuid
  AND role='PERSONAL_OWNER' AND status='ACTIVE'
 );
CREATE POLICY pay54_wallet35_binding ON pay54.personal_wallet_bindings
 FOR SELECT TO pay54_wallet_read_owner_role
 USING (
  account_id=NULLIF(current_setting('pay54.wallet35_account',true),'')::uuid
  AND wallet_id=NULLIF(current_setting('pay54.wallet35_wallet',true),'')::uuid
 );

-- Enforce owner- and wallet-scoped RLS on previously unscoped financial
-- tables inside this disposable transaction; no permanent policies created.
ALTER TABLE pay54.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54.wallets FORCE ROW LEVEL SECURITY;
CREATE POLICY pay54_wallet35_wallet ON pay54.wallets
 FOR SELECT TO pay54_wallet_read_owner_role
 USING (
  id=NULLIF(current_setting('pay54.wallet35_wallet',true),'')::uuid
  AND owner_subject=NULLIF(current_setting('pay54.wallet35_actor',true),'')::uuid
  AND status='ACTIVE'
 );
ALTER TABLE pay54.ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54.ledger_accounts FORCE ROW LEVEL SECURITY;
CREATE POLICY pay54_wallet35_ledger_account ON pay54.ledger_accounts
 FOR SELECT TO pay54_wallet_read_owner_role
 USING (
  wallet_id=NULLIF(current_setting('pay54.wallet35_wallet',true),'')::uuid
  AND account_class='CUSTOMER_LIABILITY' AND status='OPEN'
 );
ALTER TABLE pay54.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54.ledger_entries FORCE ROW LEVEL SECURITY;
CREATE POLICY pay54_wallet35_entries ON pay54.ledger_entries
 FOR SELECT TO pay54_wallet_read_owner_role
 USING (
  EXISTS(SELECT 1 FROM pay54.ledger_accounts la WHERE la.id=account_id
   AND la.currency=ledger_entries.currency)
 );
ALTER TABLE pay54.ledger_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54.ledger_journals FORCE ROW LEVEL SECURITY;
CREATE POLICY pay54_wallet35_journal ON pay54.ledger_journals
 FOR SELECT TO pay54_wallet_read_owner_role USING (status='POSTED');
ALTER TABLE pay54.balance_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54.balance_reservations FORCE ROW LEVEL SECURITY;
CREATE POLICY pay54_wallet35_holds ON pay54.balance_reservations
 FOR SELECT TO pay54_wallet_read_owner_role
 USING (
  status='HELD'
  AND EXISTS(SELECT 1 FROM pay54.ledger_accounts la WHERE la.id=account_id
   AND la.currency=balance_reservations.currency)
 );

CREATE FUNCTION pay54.wallet_read_restricted_disposable(
 p_token_digest bytea,p_account_id uuid,p_wallet_id uuid,p_currency varchar(3)
) RETURNS TABLE(account_id uuid,wallet_id uuid,currency text,
                posted_minor text,held_minor text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pay54,pg_temp
AS $function$
DECLARE v_principal uuid;
BEGIN
 IF current_setting('transaction_read_only')<>'on'
 OR current_setting('transaction_isolation') NOT IN ('repeatable read','serializable')
 OR octet_length(p_token_digest)<>32
 OR p_account_id IS NULL OR p_wallet_id IS NULL
 OR p_currency !~ '^[A-Z]{3}$'
 THEN RAISE EXCEPTION 'PAY54_WALLET_READ_REJECTED'; END IF;

 PERFORM set_config('pay54.wallet35_token',encode(p_token_digest,'hex'),true);
 -- The principal comes from the live, RLS-filtered session, not the caller.
 SELECT s.principal_id INTO STRICT v_principal FROM pay54.auth_sessions s
 WHERE s.token_digest=p_token_digest AND s.active_account_id=p_account_id
   AND s.session_status='ACTIVE' AND s.revoked_at IS NULL
   AND s.issued_at<=clock_timestamp() AND s.expires_at>clock_timestamp();
 PERFORM set_config('pay54.wallet35_account',p_account_id::text,true);
 PERFORM set_config('pay54.wallet35_wallet',p_wallet_id::text,true);
 PERFORM set_config('pay54.wallet35_actor',v_principal::text,true);

 RETURN QUERY
 SELECT b.account_id,b.wallet_id,la.currency::text,
  (SELECT COALESCE(sum(e.amount_minor::numeric),0)::text
   FROM pay54.ledger_entries e
   JOIN pay54.ledger_journals j ON j.id=e.journal_id AND j.status='POSTED'
   WHERE e.account_id=la.id AND e.currency=la.currency),
  (SELECT COALESCE(sum(r.amount_minor::numeric),0)::text
   FROM pay54.balance_reservations r
   WHERE r.account_id=la.id AND r.currency=la.currency AND r.status='HELD')
 FROM pay54.account_contexts a
 JOIN pay54.account_memberships m ON m.account_id=a.id
  AND m.principal_subject=v_principal AND m.role='PERSONAL_OWNER' AND m.status='ACTIVE'
 JOIN pay54.personal_wallet_bindings b ON b.account_id=a.id
 JOIN pay54.wallets w ON w.id=b.wallet_id AND w.owner_subject=v_principal
 JOIN pay54.ledger_accounts la ON la.wallet_id=w.id
 WHERE a.id=p_account_id AND a.legal_owner_subject=v_principal
  AND a.account_type='PERSONAL' AND a.status='ACTIVE'
  AND a.verification_status='VERIFIED'
  AND b.wallet_id=p_wallet_id AND w.status='ACTIVE'
  AND la.currency=p_currency AND la.account_class='CUSTOMER_LIABILITY'
  AND la.status='OPEN';
EXCEPTION WHEN OTHERS THEN
 RAISE EXCEPTION 'PAY54_WALLET_READ_REJECTED';
END;
$function$;

REVOKE ALL ON FUNCTION pay54.wallet_read_restricted_disposable(
 bytea,uuid,uuid,varchar) FROM PUBLIC;
ALTER FUNCTION pay54.wallet_read_restricted_disposable(
 bytea,uuid,uuid,varchar) OWNER TO pay54_wallet_read_owner_role;
GRANT EXECUTE ON FUNCTION pay54.wallet_read_restricted_disposable(
 bytea,uuid,uuid,varchar) TO pay54_wallet_read_caller_role;

-- Synthetic verified owner, account, wallet and active session.
INSERT INTO pay54.account_contexts(id,legal_owner_subject,account_type,display_name,status,verification_status)
VALUES ('b3500000-0000-4000-8000-000000000001','b3500000-0000-4000-8000-000000000002',
 'PERSONAL','Batch35 isolated','ACTIVE','VERIFIED');
INSERT INTO pay54.account_memberships(account_id,principal_subject,role,status)
VALUES ('b3500000-0000-4000-8000-000000000001','b3500000-0000-4000-8000-000000000002',
 'PERSONAL_OWNER','ACTIVE');
INSERT INTO pay54.wallets(id,owner_subject,market_code,status)
VALUES ('b3500000-0000-4000-8000-000000000003','b3500000-0000-4000-8000-000000000002','GB','ACTIVE');
INSERT INTO pay54.personal_wallet_bindings(account_id,wallet_id)
VALUES ('b3500000-0000-4000-8000-000000000001','b3500000-0000-4000-8000-000000000003');
INSERT INTO pay54.ledger_accounts(id,wallet_id,currency,account_class,account_reference,status)
VALUES ('b3500000-0000-4000-8000-000000000004',
'b3500000-0000-4000-8000-000000000003','GBP','CUSTOMER_LIABILITY','batch35-disposable','OPEN');
INSERT INTO pay54.auth_sessions
 (session_id,principal_id,token_digest,csrf_digest,active_account_id,session_status,session_version,issued_at,expires_at)
VALUES ('b3500000-0000-4000-8000-000000000005','b3500000-0000-4000-8000-000000000002',
 decode(repeat('35',32),'hex'),decode(repeat('36',32),'hex'),
 'b3500000-0000-4000-8000-000000000001',
 'ACTIVE',1,clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 hour');

-- Real restricted role session; the caller never has financial direct SELECT.
SET LOCAL ROLE pay54_wallet_read_caller_role;
DO $assert$
BEGIN
 IF has_table_privilege(current_user,'pay54.ledger_entries','SELECT')
 OR has_table_privilege(current_user,'pay54.balance_reservations','SELECT')
 OR has_table_privilege(current_user,'pay54.auth_sessions','SELECT')
 OR has_table_privilege(current_user,'pay54.ledger_accounts','SELECT')
 THEN RAISE EXCEPTION 'PAY54_WALLET_DIRECT_ACCESS_EXPOSED'; END IF;
END $assert$;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT 1/(CASE WHEN COUNT(*)=1 AND min(posted_minor)='0'
 AND min(held_minor)='0' THEN 1 ELSE 0 END) AS real_caller_zero_snapshot
FROM pay54.wallet_read_restricted_disposable(
 decode(repeat('35',32),'hex'),
 'b3500000-0000-4000-8000-000000000001',
 'b3500000-0000-4000-8000-000000000003','GBP');
-- Deliberate mismatches must never return any balances.
SELECT 1/(CASE WHEN COUNT(*)=0 THEN 1 ELSE 0 END) AS wrong_wallet_denied
FROM pay54.wallet_read_restricted_disposable(
 decode(repeat('35',32),'hex'),
 'b3500000-0000-4000-8000-000000000001',
 'b3500000-0000-4000-8000-000000000006','GBP');
-- Invalid digest can error; encapsulate negative with savepoint not DO catch
-- because EXECUTE privilege is tested outside the read path below.
RESET ROLE;
ROLLBACK;

-- Confirm the test transaction did not persist the function or grants.
SELECT 1/(CASE WHEN to_regprocedure(
 'pay54.wallet_read_restricted_disposable(bytea,uuid,uuid,character varying)') IS NULL
 AND NOT has_table_privilege('pay54_wallet_read_owner_role',
 'pay54.ledger_entries','SELECT') THEN 1 ELSE 0 END)
 AS disposable_authority_destroyed;
