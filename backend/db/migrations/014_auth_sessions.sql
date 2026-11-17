-- PAY54 Batch 22 / replacement 821 — migration 014.
-- Additive credential-scoped sessions on top of existing migrations 001–013.
-- PAY54 account_contexts and account_memberships are canonical; not redefined.
-- No login is assigned and no customer session is created by this migration.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';

DO $$
BEGIN
  IF to_regclass('pay54.account_contexts') IS NULL OR
     to_regclass('pay54.account_memberships') IS NULL OR
     NOT EXISTS(SELECT 1 FROM pg_roles
       WHERE rolname='pay54_account_reader_role') THEN
    RAISE EXCEPTION 'PAY54_CANONICAL_ACCOUNT_MIGRATIONS_001_013_REQUIRED';
  END IF;
  IF to_regclass('pay54.auth_sessions') IS NOT NULL OR
     EXISTS(SELECT 1 FROM pg_roles WHERE rolname='pay54_session_read_role') THEN
    RAISE EXCEPTION 'PAY54_SESSION_MIGRATION_CONFLICT_REVIEW_REQUIRED';
  END IF;
END
$$;

CREATE ROLE pay54_session_read_role
  NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS
  NOCREATEDB NOCREATEROLE NOREPLICATION;

CREATE TABLE pay54.auth_sessions (
  session_id uuid PRIMARY KEY,
  principal_id uuid NOT NULL,
  token_digest bytea NOT NULL UNIQUE CHECK (octet_length(token_digest)=32),
  csrf_digest bytea NOT NULL CHECK (octet_length(csrf_digest)=32),
  active_account_id uuid REFERENCES pay54.account_contexts(id)
    ON DELETE RESTRICT,
  session_status text NOT NULL
    CHECK (session_status IN ('ACTIVE','REVOKED','EXPIRED')),
  session_version bigint NOT NULL CHECK (session_version > 0),
  issued_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CHECK (expires_at > issued_at),
  CHECK (session_status <> 'REVOKED' OR revoked_at IS NOT NULL)
);

CREATE INDEX pay54_sessions_principal_idx
  ON pay54.auth_sessions(principal_id,session_status);

ALTER TABLE pay54.auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54.auth_sessions FORCE ROW LEVEL SECURITY;

REVOKE ALL ON pay54.auth_sessions FROM PUBLIC;
REVOKE ALL ON pay54.auth_sessions FROM pay54_financial_app_role;
REVOKE ALL ON pay54.auth_sessions FROM pay54_financial_audit_role;
REVOKE ALL ON pay54.auth_sessions FROM pay54_ledger_executor_role;
GRANT USAGE ON SCHEMA pay54 TO pay54_session_read_role;
GRANT SELECT ON pay54.auth_sessions TO pay54_session_read_role;

CREATE POLICY pay54_session_token_read ON pay54.auth_sessions
  FOR SELECT TO pay54_session_read_role
  USING (
    encode(token_digest,'hex') =
      NULLIF(current_setting('pay54.session_digest',true),'')
    AND session_status='ACTIVE'
    AND expires_at > clock_timestamp()
  );

-- No role memberships, login credential or session writer privileges granted.
COMMIT;
