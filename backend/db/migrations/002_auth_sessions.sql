-- PAY54 Batch 22 / 821: server-owned credential sessions.
-- Apply only after migration 001, with a separate restricted auth role.
-- This does not create users, issue credentials, grant HTTP access or switch.
BEGIN;
CREATE TABLE IF NOT EXISTS pay54.auth_sessions (
  session_id uuid PRIMARY KEY,
  principal_id uuid NOT NULL,
  token_digest bytea NOT NULL UNIQUE CHECK (octet_length(token_digest) = 32),
  csrf_digest bytea NOT NULL CHECK (octet_length(csrf_digest) = 32),
  active_account_id uuid NULL REFERENCES pay54.accounts(account_id) ON DELETE RESTRICT,
  session_status text NOT NULL CHECK (
    session_status IN ('ACTIVE','REVOKED','EXPIRED')
  ),
  session_version bigint NOT NULL CHECK (session_version > 0),
  issued_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CHECK (expires_at > issued_at),
  CHECK (session_status <> 'REVOKED' OR revoked_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS pay54_sessions_principal_idx
  ON pay54.auth_sessions(principal_id, session_status);

ALTER TABLE pay54.auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54.auth_sessions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pay54_session_credential_read ON pay54.auth_sessions;
CREATE POLICY pay54_session_credential_read ON pay54.auth_sessions
  FOR SELECT USING (
    encode(token_digest, 'hex') =
      NULLIF(current_setting('pay54.session_digest', true), '')
    AND session_status = 'ACTIVE'
    AND expires_at > clock_timestamp()
  );
-- Auth reader should be SELECT-only, NOBYPASSRLS, not object owner.
-- A different privileged session writer with audited credentials is required
-- for revocation/rotation. A read transaction never mutates these records.
COMMIT;
