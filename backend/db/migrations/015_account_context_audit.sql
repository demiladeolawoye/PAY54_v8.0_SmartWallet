-- PAY54 Batch 22 / replacement 843 — migration 015.
-- Append-only audit extension of canonical account_contexts (migration 008).
-- No runtime login/credential, account switch, or financial grant.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $$
BEGIN
  IF to_regclass('pay54.account_contexts') IS NULL OR
     to_regclass('pay54.auth_sessions') IS NULL THEN
    RAISE EXCEPTION 'PAY54_CANONICAL_ACCOUNTS_AND_SESSIONS_REQUIRED';
  END IF;
  IF to_regclass('pay54.account_context_audit') IS NOT NULL OR
     EXISTS(SELECT 1 FROM pg_roles
       WHERE rolname='pay54_context_audit_insert_role') THEN
    RAISE EXCEPTION 'PAY54_AUDIT_MIGRATION_CONFLICT_REVIEW_REQUIRED';
  END IF;
END
$$;

CREATE ROLE pay54_context_audit_insert_role
  NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS
  NOCREATEDB NOCREATEROLE NOREPLICATION;

CREATE TABLE pay54.account_context_audit (
  audit_id uuid PRIMARY KEY,
  principal_id uuid NOT NULL,
  previous_account_id uuid REFERENCES pay54.account_contexts(id),
  next_account_id uuid NOT NULL REFERENCES pay54.account_contexts(id),
  previous_session_id uuid NOT NULL,
  next_session_id uuid NOT NULL,
  expected_previous_version bigint NOT NULL CHECK(expected_previous_version > 0),
  next_session_version bigint NOT NULL,
  correlation_id uuid NOT NULL,
  event_type text NOT NULL DEFAULT 'ACCOUNT_CONTEXT_REBOUND'
    CHECK(event_type='ACCOUNT_CONTEXT_REBOUND'),
  committed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK(next_session_version=expected_previous_version+1),
  CHECK(previous_session_id<>next_session_id),
  CHECK(previous_account_id IS DISTINCT FROM next_account_id)
);

CREATE UNIQUE INDEX pay54_account_context_audit_session_unique
 ON pay54.account_context_audit(next_session_id);

ALTER TABLE pay54.account_context_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54.account_context_audit FORCE ROW LEVEL SECURITY;
REVOKE ALL ON pay54.account_context_audit FROM PUBLIC;
REVOKE ALL ON pay54.account_context_audit FROM pay54_financial_app_role;
REVOKE ALL ON pay54.account_context_audit FROM pay54_financial_audit_role;
REVOKE ALL ON pay54.account_context_audit FROM pay54_ledger_executor_role;
GRANT USAGE ON SCHEMA pay54 TO pay54_context_audit_insert_role;
GRANT INSERT ON pay54.account_context_audit TO pay54_context_audit_insert_role;

CREATE POLICY pay54_account_context_audit_insert ON pay54.account_context_audit
 FOR INSERT TO pay54_context_audit_insert_role
 WITH CHECK(principal_id = NULLIF(current_setting('pay54.actor_id',true),'')::uuid);

CREATE FUNCTION pay54.reject_account_context_audit_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path=pg_catalog,pay54 AS $$
BEGIN
  RAISE EXCEPTION 'PAY54_ACCOUNT_CONTEXT_AUDIT_APPEND_ONLY' USING ERRCODE='23514';
END
$$;

CREATE TRIGGER pay54_context_audit_append_only
 BEFORE UPDATE OR DELETE ON pay54.account_context_audit
 FOR EACH ROW EXECUTE FUNCTION pay54.reject_account_context_audit_mutation();
REVOKE EXECUTE ON FUNCTION pay54.reject_account_context_audit_mutation()
 FROM PUBLIC;
COMMIT;
