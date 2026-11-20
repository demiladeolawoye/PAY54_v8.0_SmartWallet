-- PAY54 CR-PAYTAG-01 P2B-B2A: registration idempotency persistence.
-- SOURCE ONLY. PostgreSQL 16+, migrations 001-022. No authorised writer.
-- Digest-only request keys, immutable owner and alias scope, FORCE RLS.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';

DO $preflight$
BEGIN
 IF to_regclass('pay54.paytag_registry') IS NULL OR
    to_regclass('pay54.paytag_registry_audit') IS NULL OR
    to_regclass('pay54.auth_sessions') IS NULL OR
    to_regclass('pay54.account_contexts') IS NULL OR
    to_regclass('pay54.paytag_registration_requests') IS NOT NULL
 THEN RAISE EXCEPTION 'PAY54_PAYTAG_IDEMPOTENCY_REVIEW_REQUIRED' USING ERRCODE='P0001'; END IF;
END
$preflight$;

CREATE TABLE pay54.paytag_registration_requests (
 request_id uuid PRIMARY KEY,
 owner_account_id uuid NOT NULL REFERENCES pay54.account_contexts(id)
   ON DELETE RESTRICT,
 owner_principal_id uuid NOT NULL,
 session_id uuid NOT NULL REFERENCES pay54.auth_sessions(session_id)
   ON DELETE RESTRICT,
 session_version bigint NOT NULL CHECK (session_version > 0),
 idempotency_key_digest bytea NOT NULL CHECK (octet_length(idempotency_key_digest) = 32),
 request_digest bytea NOT NULL CHECK (octet_length(request_digest) = 32),
 canonical_alias varchar(24) NOT NULL
   CHECK (canonical_alias ~ '^[a-z][a-z0-9]*([._-][a-z0-9]+)*$'),
 correlation_id uuid NOT NULL,
 request_state varchar(12) NOT NULL
   CHECK (request_state IN ('PENDING','COMMITTED')),
 registry_tag_id uuid REFERENCES pay54.paytag_registry(tag_id)
   ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 committed_at timestamptz,
 CHECK (
   (request_state = 'PENDING' AND committed_at IS NULL AND registry_tag_id IS NULL)
   OR (request_state = 'COMMITTED' AND committed_at IS NOT NULL AND registry_tag_id IS NOT NULL)
 ),
 CONSTRAINT paytag_registration_one_key_per_account UNIQUE
   (owner_account_id,idempotency_key_digest),
 CONSTRAINT paytag_registration_correlation_unique UNIQUE (correlation_id)
);
CREATE INDEX paytag_registration_owner_created_idx
 ON pay54.paytag_registration_requests(owner_account_id,created_at DESC);

-- PENDING is not a successful registration; the trusted executor must commit
-- both registry, lifecycle audit, and request transition in ONE transaction.
CREATE FUNCTION pay54.guard_paytag_registration_request()
RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pay54
AS $body$
BEGIN
 IF TG_OP = 'DELETE' THEN
   RAISE EXCEPTION 'PAY54_PAYTAG_IDEMPOTENCY_IMMUTABLE' USING ERRCODE='P0001';
 END IF;
 IF TG_OP = 'UPDATE' THEN
   IF OLD.request_state <> 'PENDING' OR NEW.request_state <> 'COMMITTED' OR
      NEW.request_id IS DISTINCT FROM OLD.request_id OR
      NEW.owner_account_id IS DISTINCT FROM OLD.owner_account_id OR
      NEW.owner_principal_id IS DISTINCT FROM OLD.owner_principal_id OR
      NEW.session_id IS DISTINCT FROM OLD.session_id OR
      NEW.session_version IS DISTINCT FROM OLD.session_version OR
      NEW.idempotency_key_digest IS DISTINCT FROM OLD.idempotency_key_digest OR
      NEW.request_digest IS DISTINCT FROM OLD.request_digest OR
      NEW.canonical_alias IS DISTINCT FROM OLD.canonical_alias OR
      NEW.correlation_id IS DISTINCT FROM OLD.correlation_id OR
      NEW.created_at IS DISTINCT FROM OLD.created_at OR
      NEW.registry_tag_id IS NULL OR NEW.committed_at IS NULL
   THEN
      RAISE EXCEPTION 'PAY54_PAYTAG_IDEMPOTENCY_IMMUTABLE' USING ERRCODE='P0001';
   END IF;
 END IF;
 RETURN NEW;
END
$body$;
CREATE TRIGGER paytag_registration_guard
BEFORE UPDATE OR DELETE ON pay54.paytag_registration_requests
FOR EACH ROW EXECUTE FUNCTION pay54.guard_paytag_registration_request();

ALTER TABLE pay54.paytag_registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54.paytag_registration_requests FORCE ROW LEVEL SECURITY;
REVOKE ALL ON pay54.paytag_registration_requests FROM PUBLIC;
REVOKE ALL ON pay54.paytag_registration_requests FROM pay54_financial_app_role;
REVOKE ALL ON pay54.paytag_registration_requests FROM pay54_financial_audit_role;
REVOKE ALL ON pay54.paytag_registration_requests FROM pay54_ledger_executor_role;
REVOKE EXECUTE ON FUNCTION pay54.guard_paytag_registration_request() FROM PUBLIC;
COMMIT;
