-- PAY54 CR-PAYTAG-01 P2B-B2B3B / migration 025.
-- SOURCE ONLY: executable only by disposable-DB privileged test owner.
-- No runtime role, membership, function grants or customer endpoint.
-- Requires migrations 001–024 and independently tested PostgreSQL 16+.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';

DO $preflight$
BEGIN
 IF to_regclass('pay54.auth_sessions') IS NULL OR
    to_regclass('pay54.account_contexts') IS NULL OR
    to_regclass('pay54.account_memberships') IS NULL OR
    to_regclass('pay54.personal_wallet_bindings') IS NULL OR
    to_regclass('pay54.paytag_registration_requests') IS NULL OR
    to_regclass('pay54.paytag_registry_audit') IS NULL OR
    to_regprocedure(
     'pay54.register_paytag_trusted(bytea,bytea,uuid,bigint,uuid,uuid,text,bytea,bytea,uuid,uuid)'
    ) IS NOT NULL
 THEN RAISE EXCEPTION 'PAY54_PAYTAG_REGISTRATION_WRITER_REVIEW_REQUIRED'
      USING ERRCODE='P0001'; END IF;
END
$preflight$;

-- SECURITY INVOKER is intentional. The future restricted SECURITY DEFINER
-- owner/role/RLS policy set is a SEPARATE review gate: this migration never
-- grants execution to a customer, service or application role.
CREATE FUNCTION pay54.register_paytag_trusted(
 p_token_digest bytea,
 p_csrf_digest bytea,
 p_session_id uuid,
 p_expected_version bigint,
 p_principal_id uuid,
 p_account_id uuid,
 p_alias text,
 p_key_digest bytea,
 p_request_digest bytea,
 p_request_id uuid,
 p_correlation_id uuid
) RETURNS TABLE(tag_id uuid,request_id uuid,replayed boolean)
LANGUAGE plpgsql SECURITY INVOKER
SET search_path=pg_catalog,pay54
AS $body$
DECLARE
 v_session pay54.auth_sessions%ROWTYPE;
 v_account pay54.account_contexts%ROWTYPE;
 v_wallet uuid;
 v_prev pay54.paytag_registration_requests%ROWTYPE;
 v_tag uuid;
 v_audit_correlation uuid;
 v_now timestamptz;
BEGIN
 -- All actor/account and alias values are hints; they are never authority.
 IF p_token_digest IS NULL OR octet_length(p_token_digest)<>32 OR
    p_csrf_digest IS NULL OR octet_length(p_csrf_digest)<>32 OR
    p_token_digest=p_csrf_digest OR
    p_key_digest IS NULL OR octet_length(p_key_digest)<>32 OR
    p_request_digest IS NULL OR octet_length(p_request_digest)<>32 OR
    p_session_id IS NULL OR p_expected_version IS NULL OR
    p_expected_version<1 OR p_principal_id IS NULL OR
    p_account_id IS NULL OR p_request_id IS NULL OR
    p_correlation_id IS NULL OR
    p_alias IS NULL OR length(p_alias) NOT BETWEEN 3 AND 24 OR
    p_alias !~ '^[a-z][a-z0-9]*([._-][a-z0-9]+)*$'
 THEN
   RAISE EXCEPTION 'PAY54_PAYTAG_REGISTRATION_DENIED' USING ERRCODE='P0001';
 END IF;
 v_now:=clock_timestamp();

 SELECT s.* INTO v_session
 FROM pay54.auth_sessions s
 WHERE s.session_id=p_session_id AND
       s.token_digest=p_token_digest AND
       s.csrf_digest=p_csrf_digest AND
       s.principal_id=p_principal_id AND
       s.active_account_id=p_account_id AND
       s.session_version=p_expected_version AND
       s.session_status='ACTIVE' AND
       s.revoked_at IS NULL AND
       s.issued_at<=clock_timestamp() AND s.expires_at>clock_timestamp()
 FOR UPDATE;
 IF NOT FOUND THEN
   RAISE EXCEPTION 'PAY54_PAYTAG_REGISTRATION_DENIED' USING ERRCODE='P0001';
 END IF;

 -- Locks serialize simultaneous registrations in the same account, and
 -- ensure that account suspension and owner changes cannot race the claim.
 SELECT a.* INTO v_account FROM pay54.account_contexts a
 WHERE a.id=p_account_id AND a.account_type='PERSONAL'
   AND a.status='ACTIVE' AND a.verification_status='VERIFIED'
   AND a.legal_owner_subject=p_principal_id
 FOR UPDATE;
 IF NOT FOUND THEN
   RAISE EXCEPTION 'PAY54_PAYTAG_REGISTRATION_DENIED' USING ERRCODE='P0001';
 END IF;

 PERFORM 1 FROM pay54.account_memberships m
 WHERE m.account_id=p_account_id
   AND m.principal_subject=p_principal_id
   AND m.role='PERSONAL_OWNER' AND m.status='ACTIVE'
 FOR SHARE;
 IF NOT FOUND THEN
   RAISE EXCEPTION 'PAY54_PAYTAG_REGISTRATION_DENIED' USING ERRCODE='P0001';
 END IF;

 -- A Personal owner can have multiple currency wallets; registration
 -- chooses one canonical bound wallet deterministically, never arbitrarily
 -- from user-supplied data or a stale UI selection.
 SELECT b.wallet_id INTO v_wallet
 FROM pay54.personal_wallet_bindings b
 JOIN pay54.wallets w ON w.id=b.wallet_id
 WHERE b.account_id=p_account_id
   AND w.owner_subject=p_principal_id AND w.status='ACTIVE'
 ORDER BY b.bound_at,b.wallet_id
 LIMIT 1 FOR SHARE OF b,w;
 IF NOT FOUND THEN
   RAISE EXCEPTION 'PAY54_PAYTAG_REGISTRATION_DENIED' USING ERRCODE='P0001';
 END IF;

 SELECT i.* INTO v_prev FROM pay54.paytag_registration_requests i
 WHERE i.owner_account_id=p_account_id
   AND i.idempotency_key_digest=p_key_digest FOR UPDATE;
 IF FOUND THEN
   IF v_prev.request_state<>'COMMITTED' OR
      v_prev.registry_tag_id IS NULL OR
      v_prev.owner_principal_id<>p_principal_id OR
      v_prev.session_id<>p_session_id OR
      v_prev.session_version<>p_expected_version OR
      v_prev.canonical_alias<>p_alias OR
      v_prev.request_digest<>p_request_digest
   THEN
     RAISE EXCEPTION 'PAY54_PAYTAG_IDEMPOTENCY_REPLAY_DENIED'
       USING ERRCODE='P0001';
   END IF;
   RETURN QUERY SELECT v_prev.registry_tag_id,v_prev.request_id,TRUE;
   RETURN;
 END IF;

 -- Any current tag must be handled in the separate approved lifecycle API.
 -- Registration MUST NOT silently rotate/reassign an existing beneficiary.
 IF EXISTS (SELECT 1 FROM pay54.paytag_registry r
            WHERE r.owner_account_id=p_account_id
              AND r.registry_state IN ('ACTIVE','RESERVED'))
 THEN
   RAISE EXCEPTION 'PAY54_PAYTAG_ALREADY_REGISTERED'
     USING ERRCODE='P0001';
 END IF;

 -- The BEFORE and AFTER triggers are authoritative for legal owner,
 -- bound-wallet, immutable alias and creation of CLAIMED audit evidence.
 v_tag:=gen_random_uuid();
 INSERT INTO pay54.paytag_registry(
   tag_id,canonical_alias,owner_account_id,wallet_id,
   owner_principal_id,registry_state)
 VALUES(v_tag,p_alias,p_account_id,v_wallet,p_principal_id,'RESERVED');

 SELECT a.correlation_id INTO v_audit_correlation
 FROM pay54.paytag_registry_audit a
 WHERE a.tag_id=v_tag AND a.owner_account_id=p_account_id AND
       a.owner_principal_id=p_principal_id AND a.event_kind='CLAIMED';
 IF NOT FOUND OR v_audit_correlation IS NULL THEN
   RAISE EXCEPTION 'PAY54_PAYTAG_CLAIM_AUDIT_MISSING'
     USING ERRCODE='P0001';
 END IF;

 -- Never store the caller's correlation as authoritative.
 -- Exact composite deferred FKs from 024 prove tag, alias, account,
 -- principal and immutable CLAIMED event match before transaction commit.
 INSERT INTO pay54.paytag_registration_requests(
   request_id,owner_account_id,owner_principal_id,session_id,
   session_version,idempotency_key_digest,request_digest,
   canonical_alias,correlation_id,request_state)
 VALUES(p_request_id,p_account_id,p_principal_id,p_session_id,
        p_expected_version,p_key_digest,p_request_digest,p_alias,
        v_audit_correlation,'PENDING');

 UPDATE pay54.paytag_registration_requests q SET
   request_state='COMMITTED',registry_tag_id=v_tag,
   committed_at=clock_timestamp()
 WHERE q.request_id=p_request_id AND q.request_state='PENDING';
 IF NOT FOUND THEN
   RAISE EXCEPTION 'PAY54_PAYTAG_REGISTRATION_INTEGRITY_DENIED'
     USING ERRCODE='P0001';
 END IF;
 SET CONSTRAINTS pay54.paytag_committed_must_match_exact_claim,
                 pay54.paytag_committed_must_match_registry_alias IMMEDIATE;
 RETURN QUERY SELECT v_tag,p_request_id,FALSE;
END;
$body$;

REVOKE ALL ON FUNCTION pay54.register_paytag_trusted(
 bytea,bytea,uuid,bigint,uuid,uuid,text,bytea,bytea,uuid,uuid
) FROM PUBLIC;
REVOKE ALL ON FUNCTION pay54.register_paytag_trusted(
 bytea,bytea,uuid,bigint,uuid,uuid,text,bytea,bytea,uuid,uuid
) FROM pay54_financial_app_role;
REVOKE ALL ON FUNCTION pay54.register_paytag_trusted(
 bytea,bytea,uuid,bigint,uuid,uuid,text,bytea,bytea,uuid,uuid
) FROM pay54_ledger_executor_role;
COMMIT;
