-- PAY54 Batch 23 / 868 — migration 018: isolated session rotation writer.
-- Adds a NOLOGIN, NOINHERIT role with no memberships. Source-only until
-- separately approved DBA/IAM provisioning and real staging penetration tests.
-- Canonical migrations 001–017 remain authoritative; no ledger permissions.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
BEGIN
  IF to_regclass('pay54.auth_sessions') IS NULL
     OR to_regclass('pay54.account_contexts') IS NULL
     OR to_regclass('pay54.account_memberships') IS NULL
     OR to_regclass('pay54.account_context_audit') IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM pg_roles
       WHERE rolname='pay54_account_directory_read_role'
         AND NOT rolcanlogin AND NOT rolbypassrls
     )
  THEN RAISE EXCEPTION 'PAY54_BATCH22_CANONICAL_SCHEMA_REQUIRED'; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN (
    'pay54_session_rotate_role','pay54_session_rotate_executor_role'))
     OR to_regprocedure('pay54.rotate_account_context_session(bytea,bytea,uuid,bytea,bytea,uuid,bigint,uuid,uuid,timestamptz)') IS NOT NULL
  THEN RAISE EXCEPTION 'PAY54_SESSION_ROTATION_CONFLICT_REVIEW_REQUIRED'; END IF;
END $$;

CREATE ROLE pay54_session_rotate_role NOLOGIN NOINHERIT NOSUPERUSER
  NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE ROLE pay54_session_rotate_executor_role NOLOGIN NOINHERIT NOSUPERUSER
  NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;

-- Caller is function-only; it receives ZERO direct table privileges.
-- Function owner is a different unassigned, restricted role. Only it may
-- read and mutate the exact protected rows after credential verification.
GRANT USAGE ON SCHEMA pay54 TO
  pay54_session_rotate_role, pay54_session_rotate_executor_role;
GRANT SELECT ON pay54.auth_sessions,
  pay54.account_contexts, pay54.account_memberships
  TO pay54_session_rotate_executor_role;
GRANT INSERT ON pay54.auth_sessions, pay54.account_context_audit
  TO pay54_session_rotate_executor_role;
GRANT UPDATE (session_status, revoked_at) ON pay54.auth_sessions
  TO pay54_session_rotate_executor_role;

-- Read only the credential-matched ACTIVE session, never every session.
CREATE POLICY pay54_rotate_session_read ON pay54.auth_sessions
  FOR SELECT TO pay54_session_rotate_executor_role
  USING (
    encode(token_digest,'hex') =
      NULLIF(current_setting('pay54.session_digest',true),'')
    AND session_status IN ('ACTIVE','REVOKED')
  );
CREATE POLICY pay54_rotate_session_revoke ON pay54.auth_sessions
  FOR UPDATE TO pay54_session_rotate_executor_role
  USING (
    encode(token_digest,'hex') =
      NULLIF(current_setting('pay54.session_digest',true),'')
    AND session_status='ACTIVE' AND expires_at > clock_timestamp()
  )
  WITH CHECK (
    encode(token_digest,'hex') =
      NULLIF(current_setting('pay54.session_digest',true),'')
    AND session_status='REVOKED' AND revoked_at IS NOT NULL
  );
CREATE POLICY pay54_rotate_session_insert ON pay54.auth_sessions
  FOR INSERT TO pay54_session_rotate_executor_role
  WITH CHECK (
    principal_id =
      NULLIF(current_setting('pay54.actor_id',true),'')::uuid
    AND session_status='ACTIVE' AND revoked_at IS NULL
  );
CREATE POLICY pay54_rotate_member_read ON pay54.account_memberships
  FOR SELECT TO pay54_session_rotate_executor_role
  USING (
    principal_subject =
      NULLIF(current_setting('pay54.actor_id',true),'')::uuid
    AND status='ACTIVE'
  );
CREATE POLICY pay54_rotate_account_read ON pay54.account_contexts
  FOR SELECT TO pay54_session_rotate_executor_role
  USING (
    status='ACTIVE' AND verification_status='VERIFIED'
    AND EXISTS (
      SELECT 1 FROM pay54.account_memberships m
      WHERE m.account_id=account_contexts.id
        AND m.principal_subject =
          NULLIF(current_setting('pay54.actor_id',true),'')::uuid
        AND m.status='ACTIVE'
    )
  );
CREATE POLICY pay54_rotate_audit_append ON pay54.account_context_audit
  FOR INSERT TO pay54_session_rotate_executor_role
  WITH CHECK (
    principal_id =
      NULLIF(current_setting('pay54.actor_id',true),'')::uuid
    AND event_type='ACCOUNT_CONTEXT_REBOUND'
  );

-- Restricted SECURITY DEFINER owner: not a superuser, not a table owner and\n-- never BYPASSRLS. The callable role has no direct table writes. In one transaction:
-- lock old session, check CSRF/version/account membership, revoke old token,
-- issue a new digest-only row, append a durable audit entry.
-- The function NEVER accepts browser principal/role and returns no token.
CREATE FUNCTION pay54.rotate_account_context_session(
  p_existing_digest bytea,
  p_csrf_digest bytea,
  p_new_session_id uuid,
  p_new_token_digest bytea,
  p_new_csrf_digest bytea,
  p_requested_account_id uuid,
  p_expected_version bigint,
  p_correlation_id uuid,
  p_audit_id uuid,
  p_new_expires_at timestamptz
) RETURNS TABLE(rotated_session_id uuid, rotated_session_version bigint)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog,pay54
AS $$
DECLARE
  v_session pay54.auth_sessions%ROWTYPE;
  v_allowed boolean;
BEGIN
  IF p_existing_digest IS NULL OR octet_length(p_existing_digest) <> 32
     OR p_csrf_digest IS NULL OR octet_length(p_csrf_digest) <> 32
     OR p_new_token_digest IS NULL OR octet_length(p_new_token_digest) <> 32
     OR p_new_csrf_digest IS NULL OR octet_length(p_new_csrf_digest) <> 32
     OR p_new_token_digest = p_existing_digest
     OR p_new_csrf_digest = p_csrf_digest
     OR p_new_session_id IS NULL OR p_requested_account_id IS NULL
     OR p_correlation_id IS NULL OR p_audit_id IS NULL
     OR p_expected_version IS NULL OR p_expected_version < 1
     OR p_expected_version >= 9223372036854775807
     OR p_new_expires_at IS NULL
  THEN RAISE EXCEPTION 'PAY54_SESSION_ROTATION_DENIED' USING ERRCODE='P0001'; END IF;

  PERFORM set_config('pay54.session_digest',
    encode(p_existing_digest,'hex'),true);
  SELECT s.* INTO v_session
    FROM pay54.auth_sessions s
    WHERE s.token_digest=p_existing_digest
      AND s.session_status='ACTIVE'
      AND s.session_version=p_expected_version
      AND s.expires_at > clock_timestamp()
    FOR UPDATE;
  IF NOT FOUND OR v_session.active_account_id IS NULL
     OR v_session.session_id=p_new_session_id
     OR v_session.csrf_digest <> p_csrf_digest
     OR v_session.active_account_id=p_requested_account_id
     OR p_new_expires_at <= clock_timestamp()
     OR p_new_expires_at > v_session.expires_at
  THEN RAISE EXCEPTION 'PAY54_SESSION_ROTATION_DENIED' USING ERRCODE='P0001'; END IF;

  PERFORM set_config('pay54.actor_id',
    v_session.principal_id::text,true);

  SELECT EXISTS(
    SELECT 1 FROM pay54.account_contexts a
      JOIN pay54.account_memberships m ON m.account_id=a.id
      WHERE a.id=p_requested_account_id
        AND m.principal_subject=v_session.principal_id
        AND a.status='ACTIVE' AND a.verification_status='VERIFIED'
        AND m.status='ACTIVE'
        AND (a.account_type='BUSINESS' OR
          (a.account_type='PERSONAL' AND
           a.legal_owner_subject=v_session.principal_id
           AND m.role='PERSONAL_OWNER'))
  ) INTO v_allowed;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'PAY54_SESSION_ROTATION_DENIED' USING ERRCODE='P0001';
  END IF;

  UPDATE pay54.auth_sessions SET
    session_status='REVOKED', revoked_at=clock_timestamp()
  WHERE session_id=v_session.session_id;

  INSERT INTO pay54.auth_sessions (
    session_id, principal_id, token_digest, csrf_digest, active_account_id,
    session_status,session_version,issued_at,expires_at
  ) VALUES (
    p_new_session_id,v_session.principal_id,p_new_token_digest,
    p_new_csrf_digest,p_requested_account_id,'ACTIVE',
    v_session.session_version+1,clock_timestamp(),p_new_expires_at
  );
  INSERT INTO pay54.account_context_audit (
    audit_id,principal_id,previous_account_id,next_account_id,
    previous_session_id,next_session_id,expected_previous_version,
    next_session_version,correlation_id
  ) VALUES (
    p_audit_id,v_session.principal_id,v_session.active_account_id,
    p_requested_account_id,v_session.session_id,p_new_session_id,
    v_session.session_version,v_session.session_version+1,p_correlation_id
  );

  RETURN QUERY SELECT p_new_session_id,v_session.session_version+1;
END $$;

-- PostgreSQL requires the new function owner to have schema CREATE.
-- Grant this only inside this migration transaction, then revoke it before
-- COMMIT. Neither role is allowed to create future objects.
GRANT CREATE ON SCHEMA pay54 TO pay54_session_rotate_executor_role;
ALTER FUNCTION pay54.rotate_account_context_session(
  bytea,bytea,uuid,bytea,bytea,uuid,bigint,uuid,uuid,timestamptz
) OWNER TO pay54_session_rotate_executor_role;
REVOKE CREATE ON SCHEMA pay54 FROM pay54_session_rotate_executor_role;

REVOKE ALL ON FUNCTION pay54.rotate_account_context_session(
  bytea,bytea,uuid,bytea,bytea,uuid,bigint,uuid,uuid,timestamptz
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pay54.rotate_account_context_session(
  bytea,bytea,uuid,bytea,bytea,uuid,bigint,uuid,uuid,timestamptz
) TO pay54_session_rotate_role;

-- Deliberately no role membership, login, runtime secret, HTTP route or funds.
COMMIT;
