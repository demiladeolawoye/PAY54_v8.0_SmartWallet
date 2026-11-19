-- PAY54 Batch 24 / 922 — one-time identity assertion consumption and
-- short-lived bootstrap session issuance for future, trusted staging auth.
-- The SQL function deliberately DOES NOT validate the access-token signature:
-- that MUST be done by the independent trusted backend verifier before call.
-- The callable NOLOGIN role is unassigned and has only EXECUTE permission.
-- No staging/production migration or customer credentials provisioned.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $$
BEGIN
 IF to_regclass('pay54.auth_sessions') IS NULL
    OR to_regclass('pay54.account_contexts') IS NULL
    OR to_regprocedure(
      'pay54.rotate_account_context_session(bytea,bytea,uuid,bytea,bytea,uuid,bigint,uuid,uuid,timestamptz)'
    ) IS NULL
 THEN RAISE EXCEPTION 'PAY54_MIGRATION_018_REQUIRED'; END IF;
 IF to_regclass('pay54.identity_assertion_receipts') IS NOT NULL
    OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN(
      'pay54_session_issue_role','pay54_session_issue_executor_role'
    ))
 THEN RAISE EXCEPTION 'PAY54_ISSUER_MIGRATION_CONFLICT'; END IF;
END $$;

CREATE ROLE pay54_session_issue_role NOLOGIN NOINHERIT NOSUPERUSER
 NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE ROLE pay54_session_issue_executor_role NOLOGIN NOINHERIT NOSUPERUSER
 NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;

CREATE TABLE pay54.identity_assertion_receipts(
 issuer text NOT NULL CHECK(length(issuer) BETWEEN 12 AND 200),
 assertion_id uuid NOT NULL,
 principal_id uuid NOT NULL,
 bootstrap_session_id uuid NOT NULL UNIQUE,
 consumed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 assertion_expires_at timestamptz NOT NULL,
 PRIMARY KEY (issuer, assertion_id),
 CHECK(assertion_expires_at > consumed_at)
);
ALTER TABLE pay54.identity_assertion_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54.identity_assertion_receipts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON pay54.identity_assertion_receipts FROM PUBLIC;

GRANT USAGE ON SCHEMA pay54 TO
 pay54_session_issue_role,pay54_session_issue_executor_role;
GRANT INSERT ON pay54.identity_assertion_receipts,pay54.auth_sessions
 TO pay54_session_issue_executor_role;

CREATE POLICY pay54_issue_receipt_insert
 ON pay54.identity_assertion_receipts FOR INSERT
 TO pay54_session_issue_executor_role
 WITH CHECK(principal_id =
  NULLIF(current_setting('pay54.actor_id',true),'')::uuid);
CREATE POLICY pay54_issue_bootstrap_session
 ON pay54.auth_sessions FOR INSERT TO pay54_session_issue_executor_role
 WITH CHECK(
  principal_id =
    NULLIF(current_setting('pay54.actor_id',true),'')::uuid
  AND active_account_id IS NULL
  AND session_status='ACTIVE'
  AND session_version=1
  AND revoked_at IS NULL
 );

CREATE FUNCTION pay54.consume_identity_assertion_and_issue_bootstrap(
 p_trusted_issuer text,
 p_verified_principal uuid,
 p_assertion_id uuid,
 p_assertion_expires_at timestamptz,
 p_session_id uuid,
 p_token_digest bytea,
 p_csrf_digest bytea
) RETURNS TABLE(issued_session_id uuid,issued_expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pay54
AS $$
DECLARE
 v_now timestamptz := clock_timestamp();
 v_expiry timestamptz;
BEGIN
 IF p_trusted_issuer IS NULL
    OR p_trusted_issuer !~ '^https://[a-zA-Z0-9.-]+$'
    OR length(p_trusted_issuer)>200
    OR p_verified_principal IS NULL OR p_assertion_id IS NULL
    OR p_session_id IS NULL
    OR p_assertion_expires_at IS NULL
    OR p_assertion_expires_at<=v_now
    OR p_assertion_expires_at>v_now+interval '5 minutes'
    OR p_token_digest IS NULL OR octet_length(p_token_digest)<>32
    OR p_csrf_digest IS NULL OR octet_length(p_csrf_digest)<>32
    OR p_token_digest=p_csrf_digest
 THEN RAISE EXCEPTION 'PAY54_BOOTSTRAP_ISSUANCE_DENIED' USING ERRCODE='P0001';
 END IF;

 PERFORM set_config('pay54.actor_id',p_verified_principal::text,true);
 v_expiry:=LEAST(p_assertion_expires_at,v_now+interval '5 minutes');

 INSERT INTO pay54.identity_assertion_receipts(
  issuer,assertion_id,principal_id,bootstrap_session_id,
  consumed_at,assertion_expires_at
 ) VALUES (
  p_trusted_issuer,p_assertion_id,p_verified_principal,
  p_session_id,v_now,p_assertion_expires_at
 );

 INSERT INTO pay54.auth_sessions(
   session_id,principal_id,token_digest,csrf_digest,active_account_id,
   session_status,session_version,issued_at,expires_at
 ) VALUES (
   p_session_id,p_verified_principal,p_token_digest,p_csrf_digest,NULL,
   'ACTIVE',1,v_now,v_expiry
 );
 RETURN QUERY SELECT p_session_id,v_expiry;
END $$;

GRANT CREATE ON SCHEMA pay54 TO pay54_session_issue_executor_role;
ALTER FUNCTION pay54.consume_identity_assertion_and_issue_bootstrap(
 text,uuid,uuid,timestamptz,uuid,bytea,bytea
) OWNER TO pay54_session_issue_executor_role;
REVOKE CREATE ON SCHEMA pay54 FROM pay54_session_issue_executor_role;
REVOKE ALL ON FUNCTION pay54.consume_identity_assertion_and_issue_bootstrap(
 text,uuid,uuid,timestamptz,uuid,bytea,bytea
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pay54.consume_identity_assertion_and_issue_bootstrap(
 text,uuid,uuid,timestamptz,uuid,bytea,bytea
) TO pay54_session_issue_role;

-- No LOGIN role membership, credential or issuer trust root is created.
COMMIT;
