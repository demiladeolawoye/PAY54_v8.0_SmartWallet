-- PAY54 Batch 22 / 843: durable, append-only account context audit.
-- Migration owner role applies this. The application reader roles receive NO
-- INSERT/UPDATE/DELETE privileges on this table. A future dedicated, trusted
-- session-write service must commit the audit and session CAS atomically.
BEGIN;

CREATE TABLE IF NOT EXISTS pay54.account_context_audit (
  audit_id uuid PRIMARY KEY,
  principal_id uuid NOT NULL,
  previous_account_id uuid,
  next_account_id uuid NOT NULL REFERENCES pay54.accounts(account_id),
  previous_session_id uuid NOT NULL,
  next_session_id uuid NOT NULL,
  expected_previous_version bigint NOT NULL CHECK (expected_previous_version > 0),
  next_session_version bigint NOT NULL,
  correlation_id uuid NOT NULL,
  event_type text NOT NULL DEFAULT 'ACCOUNT_CONTEXT_REBOUND'
    CHECK (event_type='ACCOUNT_CONTEXT_REBOUND'),
  committed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (next_session_version = expected_previous_version + 1),
  CHECK (previous_session_id <> next_session_id),
  CHECK (previous_account_id IS DISTINCT FROM next_account_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS pay54_account_context_audit_session_unique
  ON pay54.account_context_audit(next_session_id);

ALTER TABLE pay54.account_context_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54.account_context_audit FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pay54_account_context_audit_insert ON pay54.account_context_audit;
CREATE POLICY pay54_account_context_audit_insert ON pay54.account_context_audit
  FOR INSERT WITH CHECK (
    principal_id = NULLIF(current_setting('pay54.actor_id', true), '')::uuid
  );

CREATE OR REPLACE FUNCTION pay54.reject_account_audit_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, pay54 AS $$
BEGIN
  RAISE EXCEPTION 'PAY54_ACCOUNT_AUDIT_APPEND_ONLY' USING ERRCODE='23514';
END
$$;

DROP TRIGGER IF EXISTS pay54_account_audit_immutable ON pay54.account_context_audit;
CREATE TRIGGER pay54_account_audit_immutable
  BEFORE UPDATE OR DELETE ON pay54.account_context_audit
  FOR EACH ROW EXECUTE FUNCTION pay54.reject_account_audit_mutation();

COMMIT;
