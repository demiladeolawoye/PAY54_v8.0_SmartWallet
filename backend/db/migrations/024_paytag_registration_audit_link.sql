-- PAY54 CR-PAYTAG-01 P2B-B2B3A: canonical claim-to-audit linkage.
-- PostgreSQL 16+; SOURCE ONLY. Requires migrations 001–023.
-- No registration writer, role privilege, route, DML or production approval.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';

DO $preflight$
BEGIN
 IF to_regclass('pay54.paytag_registry_audit') IS NULL OR
    to_regclass('pay54.paytag_registration_requests') IS NULL OR
    to_regprocedure('pay54.paytag_registry_audit_append()') IS NULL OR
    EXISTS(SELECT 1 FROM information_schema.columns
      WHERE table_schema='pay54'
        AND table_name='paytag_registration_requests'
        AND column_name='audit_event_kind')
 THEN RAISE EXCEPTION 'PAY54_PAYTAG_AUDIT_LINK_REVIEW_REQUIRED'
      USING ERRCODE='P0001'; END IF;
END
$preflight$;

-- Every event has a unique correlation; a tag has exactly one original
-- CLAIMED event, independently of later ACTIVATED/RETIRED events.
ALTER TABLE pay54.paytag_registry_audit
  ADD CONSTRAINT paytag_audit_correlation_unique UNIQUE (correlation_id);
CREATE UNIQUE INDEX paytag_audit_one_claim_per_tag
  ON pay54.paytag_registry_audit(tag_id)
  WHERE event_kind='CLAIMED';

-- The legacy CLAIMED trigger creates an independent random correlation ID.
-- The future trusted writer must read THAT database-generated event under
-- the transaction and use its correlation ID in its idempotency record;
-- client-provided correlation IDs are never authoritative.
ALTER TABLE pay54.paytag_registry_audit
  ADD CONSTRAINT paytag_audit_exact_claim_tuple UNIQUE
    (correlation_id,tag_id,owner_account_id,owner_principal_id,event_kind);

-- The generated event kind prevents a COMMITTED request from referencing an
-- unrelated ACTIVATED or RETIRED event. A PENDING row has NULL tag_id so
-- MATCH SIMPLE intentionally does not enforce a claim until it commits.
ALTER TABLE pay54.paytag_registration_requests
  ADD COLUMN audit_event_kind varchar(20)
    GENERATED ALWAYS AS ('CLAIMED'::varchar(20)) STORED;
ALTER TABLE pay54.paytag_registration_requests
  ADD CONSTRAINT paytag_committed_must_match_exact_claim
  FOREIGN KEY
    (correlation_id,registry_tag_id,owner_account_id,
     owner_principal_id,audit_event_kind)
  REFERENCES pay54.paytag_registry_audit
    (correlation_id,tag_id,owner_account_id,owner_principal_id,event_kind)
  ON UPDATE RESTRICT ON DELETE RESTRICT
  DEFERRABLE INITIALLY DEFERRED;

-- Maintain the original no-policy, forced-RLS and no-direct-DML posture.
ALTER TABLE pay54.paytag_registry_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54.paytag_registry_audit FORCE ROW LEVEL SECURITY;
ALTER TABLE pay54.paytag_registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54.paytag_registration_requests FORCE ROW LEVEL SECURITY;
REVOKE ALL ON pay54.paytag_registry_audit FROM PUBLIC;
REVOKE ALL ON pay54.paytag_registration_requests FROM PUBLIC;
REVOKE ALL ON pay54.paytag_registry_audit FROM pay54_financial_app_role;
REVOKE ALL ON pay54.paytag_registration_requests FROM pay54_financial_app_role;
REVOKE ALL ON pay54.paytag_registry_audit FROM pay54_ledger_executor_role;
REVOKE ALL ON pay54.paytag_registration_requests FROM pay54_ledger_executor_role;
COMMIT;
