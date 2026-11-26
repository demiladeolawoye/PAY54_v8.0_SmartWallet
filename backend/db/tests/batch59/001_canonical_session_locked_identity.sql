-- PAY54 Wave 6: canonical auth_sessions transaction-bound identity proof.
-- Actual PG16 canonical table. Privileged fixture installer, NO financial writer.
-- All fixture rows and function DDL are rolled back.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='25s';
DO $guard$
BEGIN
 IF current_database()<>'pay54_disposable_ci'
 OR session_user<>'postgres' OR current_user<>'postgres'
 OR to_regclass('pay54.auth_sessions') IS NULL
 OR NOT (SELECT relforcerowsecurity FROM pg_class
         WHERE oid='pay54.auth_sessions'::regclass)
 THEN RAISE EXCEPTION 'PAY54_W6_DISPOSABLE_CANONICAL_ONLY'; END IF;
 IF has_function_privilege('pay54_ledger_executor_role',
  'pay54.reserve_wallet_transfer(uuid,uuid,uuid,bigint,text,text,timestamp with time zone)','EXECUTE')
 THEN RAISE EXCEPTION 'PAY54_W6_FINANCIAL_EXECUTION_LEAK'; END IF;
END $guard$;

INSERT INTO pay54.account_contexts
 (id,legal_owner_subject,account_type,display_name,status,verification_status)
VALUES
 ('a6600000-0000-4000-8000-000000000001',
  'a6600000-0000-4000-8000-000000000011',
  'PERSONAL','Wave6 transactional principal','ACTIVE','VERIFIED');

INSERT INTO pay54.account_memberships
 (account_id,principal_subject,role,status)
VALUES
 ('a6600000-0000-4000-8000-000000000001',
  'a6600000-0000-4000-8000-000000000011',
  'PERSONAL_OWNER','ACTIVE');

INSERT INTO pay54.auth_sessions
 (session_id,principal_id,token_digest,csrf_digest,active_account_id,
  session_status,session_version,issued_at,expires_at)
VALUES
 ('a6600000-0000-4000-8000-000000000101',
  'a6600000-0000-4000-8000-000000000011',
  decode(repeat('a6',32),'hex'),decode(repeat('b6',32),'hex'),
  'a6600000-0000-4000-8000-000000000001',
  'ACTIVE',1,clock_timestamp()-interval '2 minutes',
  clock_timestamp()+interval '1 hour');

-- This is disposable-only, SECURITY INVOKER and has no financial DML.
-- The same transaction retains SELECT FOR UPDATE locks until COMMIT/ROLLBACK.
CREATE FUNCTION pg_temp.pay54_w6_resolve_locked_principal(
 p_token_digest bytea,p_account_id uuid,p_session_version bigint
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER
SET search_path=pg_catalog,pay54
AS $$
DECLARE p uuid;
BEGIN
 IF p_token_digest IS NULL OR octet_length(p_token_digest)<>32
 OR p_account_id IS NULL OR p_session_version IS NULL
 OR p_session_version<=0
 THEN RAISE EXCEPTION 'PAY54_W6_IDENTITY_DENIED'
  USING ERRCODE='P5457'; END IF;

 SELECT s.principal_id INTO p
 FROM pay54.auth_sessions s
 WHERE s.token_digest=p_token_digest
   AND s.active_account_id=p_account_id
   AND s.session_version=p_session_version
   AND s.session_status='ACTIVE' AND s.revoked_at IS NULL
   AND s.issued_at<=clock_timestamp()
   AND s.expires_at>clock_timestamp()
 FOR UPDATE OF s;

 IF p IS NULL OR NOT EXISTS(
  SELECT 1 FROM pay54.account_contexts a
  JOIN pay54.account_memberships m ON m.account_id=a.id
  WHERE a.id=p_account_id AND a.legal_owner_subject=p
   AND a.account_type='PERSONAL' AND a.status='ACTIVE'
   AND a.verification_status='VERIFIED'
   AND m.principal_subject=p AND m.role='PERSONAL_OWNER'
   AND m.status='ACTIVE'
 ) THEN RAISE EXCEPTION 'PAY54_W6_IDENTITY_DENIED'
  USING ERRCODE='P5457'; END IF;
 RETURN p;
END;
$$;

DO $positive$
DECLARE p uuid; denied boolean;
BEGIN
 p:=pg_temp.pay54_w6_resolve_locked_principal(
 decode(repeat('a6',32),'hex'),
 'a6600000-0000-4000-8000-000000000001',1);
 IF p IS DISTINCT FROM 'a6600000-0000-4000-8000-000000000011'::uuid
 THEN RAISE EXCEPTION 'PAY54_W6_WRONG_VERIFIED_PRINCIPAL'; END IF;
 denied:=false;
 BEGIN
  PERFORM pg_temp.pay54_w6_resolve_locked_principal(
    decode(repeat('c6',32),'hex'),
    'a6600000-0000-4000-8000-000000000001',1);
 EXCEPTION WHEN SQLSTATE 'P5457' THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'PAY54_W6_WRONG_TOKEN_ACCEPTED'; END IF;
 denied:=false;
 BEGIN
  PERFORM pg_temp.pay54_w6_resolve_locked_principal(
    decode(repeat('a6',32),'hex'),
    'a6600000-0000-4000-8000-000000000002',1);
 EXCEPTION WHEN SQLSTATE 'P5457' THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'PAY54_W6_FOREIGN_ACCOUNT_ACCEPTED'; END IF;
 denied:=false;
 BEGIN
  PERFORM pg_temp.pay54_w6_resolve_locked_principal(
    decode(repeat('a6',32),'hex'),
    'a6600000-0000-4000-8000-000000000001',2);
 EXCEPTION WHEN SQLSTATE 'P5457' THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'PAY54_W6_STALE_SESSION_VERSION_ACCEPTED'; END IF;
END $positive$;

UPDATE pay54.auth_sessions
 SET session_status='REVOKED',session_version=2,revoked_at=clock_timestamp()
 WHERE session_id='a6600000-0000-4000-8000-000000000101'
 AND session_version=1 AND session_status='ACTIVE';

DO $revoked$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM pg_temp.pay54_w6_resolve_locked_principal(
  decode(repeat('a6',32),'hex'),
  'a6600000-0000-4000-8000-000000000001',1);
 EXCEPTION WHEN SQLSTATE 'P5457' THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'PAY54_W6_REVOKED_SESSION_ACCEPTED'; END IF;
END $revoked$;
ROLLBACK;
-- Verify that no synthetic canonical account/session fixture survived.
SELECT 1/(CASE WHEN
 NOT EXISTS(SELECT 1 FROM pay54.auth_sessions
 WHERE session_id='a6600000-0000-4000-8000-000000000101')
 AND NOT EXISTS(SELECT 1 FROM pay54.account_contexts
 WHERE id='a6600000-0000-4000-8000-000000000001')
 THEN 1 ELSE 0 END);
\echo PAY54_W6_CANONICAL_AUTH_SESSION_LOCK_PROOF_PASSED
