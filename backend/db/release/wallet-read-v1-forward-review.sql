-- PAY54 Batch38 — REVIEW CANDIDATE ONLY; NO STAGING AUTHORIZATION.
-- Deploy only by approved DBA with signed rollback and operational gates.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '25s';

DO $preflight$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='pay54_wallet_read_owner_role'
    AND NOT rolcanlogin AND NOT rolbypassrls AND NOT rolsuper)
 OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='pay54_wallet_read_caller_role'
    AND NOT rolcanlogin AND NOT rolbypassrls AND NOT rolsuper)
 OR to_regprocedure('pay54.wallet_read_restricted_v1(bytea,uuid,uuid,character varying)') IS NOT NULL
 OR EXISTS (SELECT 1 FROM pg_class WHERE oid IN (
   'pay54.wallets'::regclass,'pay54.ledger_accounts'::regclass,
   'pay54.ledger_entries'::regclass,'pay54.ledger_journals'::regclass,
   'pay54.balance_reservations'::regclass) AND relrowsecurity)
 THEN RAISE EXCEPTION 'PAY54_WALLET_READ_FORWARD_PRECONDITION_DENIED'; END IF;
END $preflight$;

-- Grants restricted to an isolated NOLOGIN function-owner role.
-- Caller has only function EXECUTE, not financial table SELECT.
GRANT SELECT ON
 pay54.auth_sessions,pay54.account_contexts,pay54.account_memberships,
 pay54.personal_wallet_bindings,pay54.wallets,pay54.ledger_accounts,
 pay54.ledger_entries,pay54.ledger_journals,pay54.balance_reservations
 TO pay54_wallet_read_owner_role;

-- Identity rows are additionally guarded by actor/session/active account RLS.
CREATE POLICY pay54_wallet38_session ON pay54.auth_sessions
 FOR SELECT TO pay54_wallet_read_owner_role
 USING (
   token_digest=decode(NULLIF(current_setting('pay54.wallet38_token',true),''),'hex')
   AND session_status='ACTIVE' AND revoked_at IS NULL
   AND issued_at<=clock_timestamp() AND expires_at>clock_timestamp()
 );
CREATE POLICY pay54_wallet38_account ON pay54.account_contexts
 FOR SELECT TO pay54_wallet_read_owner_role
 USING (
  id=NULLIF(current_setting('pay54.wallet38_account',true),'')::uuid
  AND legal_owner_subject=NULLIF(current_setting('pay54.wallet38_actor',true),'')::uuid
  AND account_type='PERSONAL' AND status='ACTIVE'
  AND verification_status='VERIFIED'
 );
CREATE POLICY pay54_wallet38_membership ON pay54.account_memberships
 FOR SELECT TO pay54_wallet_read_owner_role
 USING (
  account_id=NULLIF(current_setting('pay54.wallet38_account',true),'')::uuid
  AND principal_subject=NULLIF(current_setting('pay54.wallet38_actor',true),'')::uuid
  AND role='PERSONAL_OWNER' AND status='ACTIVE'
 );
CREATE POLICY pay54_wallet38_binding ON pay54.personal_wallet_bindings
 FOR SELECT TO pay54_wallet_read_owner_role
 USING (
  account_id=NULLIF(current_setting('pay54.wallet38_account',true),'')::uuid
  AND wallet_id=NULLIF(current_setting('pay54.wallet38_wallet',true),'')::uuid
 );

-- Enforce owner- and wallet-scoped RLS on financial tables.
-- These changes MUST have independently rehearsed rollback.
ALTER TABLE pay54.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54.wallets FORCE ROW LEVEL SECURITY;
CREATE POLICY pay54_wallet38_wallet ON pay54.wallets
 FOR SELECT TO pay54_wallet_read_owner_role
 USING (
  id=NULLIF(current_setting('pay54.wallet38_wallet',true),'')::uuid
  AND owner_subject=NULLIF(current_setting('pay54.wallet38_actor',true),'')::uuid
  AND status='ACTIVE'
 );
ALTER TABLE pay54.ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54.ledger_accounts FORCE ROW LEVEL SECURITY;
CREATE POLICY pay54_wallet38_ledger_account ON pay54.ledger_accounts
 FOR SELECT TO pay54_wallet_read_owner_role
 USING (
  wallet_id=NULLIF(current_setting('pay54.wallet38_wallet',true),'')::uuid
  AND account_class='CUSTOMER_LIABILITY' AND status='OPEN'
 );
ALTER TABLE pay54.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54.ledger_entries FORCE ROW LEVEL SECURITY;
CREATE POLICY pay54_wallet38_entries ON pay54.ledger_entries
 FOR SELECT TO pay54_wallet_read_owner_role
 USING (
  EXISTS(SELECT 1 FROM pay54.ledger_accounts la WHERE la.id=account_id
   AND la.currency=ledger_entries.currency)
 );
ALTER TABLE pay54.ledger_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54.ledger_journals FORCE ROW LEVEL SECURITY;
CREATE POLICY pay54_wallet38_journal ON pay54.ledger_journals
 FOR SELECT TO pay54_wallet_read_owner_role USING (status='POSTED');
ALTER TABLE pay54.balance_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54.balance_reservations FORCE ROW LEVEL SECURITY;
CREATE POLICY pay54_wallet38_holds ON pay54.balance_reservations
 FOR SELECT TO pay54_wallet_read_owner_role
 USING (
  status='HELD'
  AND EXISTS(SELECT 1 FROM pay54.ledger_accounts la WHERE la.id=account_id
   AND la.currency=balance_reservations.currency)
 );

CREATE FUNCTION pay54.wallet_read_restricted_v1(
 p_token_digest bytea,p_account_id uuid,p_wallet_id uuid,p_currency varchar(3)
) RETURNS TABLE(account_id uuid,wallet_id uuid,currency text,
                posted_minor text,held_minor text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pay54,pg_temp
AS $function$
DECLARE v_principal uuid;
BEGIN
 IF current_setting('transaction_read_only') <> 'on'
 OR current_setting('transaction_isolation') NOT IN ('repeatable read','serializable')
 OR octet_length(p_token_digest)<>32
 OR p_account_id IS NULL OR p_wallet_id IS NULL
 OR p_currency !~ '^[A-Z]{3}$'
 THEN RAISE EXCEPTION 'PAY54_WALLET_READ_REJECTED'; END IF;

 PERFORM set_config('pay54.wallet38_token',encode(p_token_digest,'hex'),true);
 -- The principal comes from the live, RLS-filtered session, not the caller.
 SELECT s.principal_id INTO STRICT v_principal FROM pay54.auth_sessions s
 WHERE s.token_digest=p_token_digest AND s.active_account_id=p_account_id
   AND s.session_status='ACTIVE' AND s.revoked_at IS NULL
   AND s.issued_at<=clock_timestamp() AND s.expires_at>clock_timestamp();
 PERFORM set_config('pay54.wallet38_account',p_account_id::text,true);
 PERFORM set_config('pay54.wallet38_wallet',p_wallet_id::text,true);
 PERFORM set_config('pay54.wallet38_actor',v_principal::text,true);

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

REVOKE ALL ON FUNCTION pay54.wallet_read_restricted_v1(
 bytea,uuid,uuid,varchar) FROM PUBLIC;
ALTER FUNCTION pay54.wallet_read_restricted_v1(
 bytea,uuid,uuid,varchar) OWNER TO pay54_wallet_read_owner_role;
GRANT EXECUTE ON FUNCTION pay54.wallet_read_restricted_v1(
 bytea,uuid,uuid,varchar) TO pay54_wallet_read_caller_role;


-- No application LOGIN, credential, service role membership or HTTP route granted.
-- Transactional rollback is documented in the paired down migration.
COMMIT;
