-- PAY54 CR-PAYTAG-01 P2B-A: inert canonical lifecycle integrity guard.
-- SOURCE ONLY. Requires PostgreSQL 16+, migrations 001-021. No app grants.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $preflight$
BEGIN
  IF to_regclass('pay54.paytag_registry') IS NULL OR
     to_regclass('pay54.paytag_registry_audit') IS NULL OR
     to_regclass('pay54.personal_wallet_bindings') IS NULL OR
     to_regclass('pay54.account_memberships') IS NULL
  THEN RAISE EXCEPTION 'PAY54_PAYTAG_P2B_PREREQUISITES_MISSING'; END IF;
  IF to_regprocedure('pay54.paytag_lifecycle_guard()') IS NOT NULL
  THEN RAISE EXCEPTION 'PAY54_PAYTAG_P2B_DUPLICATE_MIGRATION'; END IF;
END
$preflight$;

CREATE FUNCTION pay54.paytag_lifecycle_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, pay54
AS $body$
DECLARE
  a record;
  w record;
  m record;
BEGIN
  -- No mutable owner, alias or wallet, including after tag retirement.
  IF TG_OP = 'UPDATE' THEN
    IF NEW.tag_id IS DISTINCT FROM OLD.tag_id OR
       NEW.canonical_alias IS DISTINCT FROM OLD.canonical_alias OR
       NEW.owner_account_id IS DISTINCT FROM OLD.owner_account_id OR
       NEW.wallet_id IS DISTINCT FROM OLD.wallet_id OR
       NEW.owner_principal_id IS DISTINCT FROM OLD.owner_principal_id OR
       NEW.created_at IS DISTINCT FROM OLD.created_at OR
       OLD.registry_state = 'RETIRED' OR
       NEW.registry_version <> OLD.registry_version + 1 OR
       (OLD.registry_state = 'RESERVED' AND NEW.registry_state NOT IN ('ACTIVE','RETIRED')) OR
       (OLD.registry_state = 'ACTIVE' AND NEW.registry_state <> 'RETIRED')
    THEN RAISE EXCEPTION 'PAY54_PAYTAG_INVALID_STATE_TRANSITION'; END IF;
  END IF;

  -- Every registry insert and transition rechecks current verified owner and
  -- active personal wallet. Locking against concurrent account status changes
  -- requires a separate reviewed transaction executor before activation.
  SELECT account_type, status, verification_status, legal_owner_subject
    INTO a FROM pay54.account_contexts WHERE id = NEW.owner_account_id FOR SHARE;
  SELECT owner_subject INTO w FROM pay54.wallets WHERE id = NEW.wallet_id FOR SHARE;
  SELECT role, status INTO m FROM pay54.account_memberships
    WHERE account_id = NEW.owner_account_id
      AND principal_subject = NEW.owner_principal_id FOR SHARE;
  IF a.account_type IS DISTINCT FROM 'PERSONAL' OR
     a.status IS DISTINCT FROM 'ACTIVE' OR
     a.verification_status IS DISTINCT FROM 'VERIFIED' OR
     a.legal_owner_subject IS DISTINCT FROM NEW.owner_principal_id OR
     w.owner_subject IS DISTINCT FROM NEW.owner_principal_id OR
     m.role IS DISTINCT FROM 'PERSONAL_OWNER' OR
     m.status IS DISTINCT FROM 'ACTIVE' OR
     NOT EXISTS (
       SELECT 1 FROM pay54.personal_wallet_bindings
       WHERE account_id = NEW.owner_account_id AND wallet_id = NEW.wallet_id
     )
  THEN RAISE EXCEPTION 'PAY54_PAYTAG_ACCOUNT_SCOPE_DENIED'; END IF;
  RETURN NEW;
END
$body$;

CREATE TRIGGER paytag_registry_lifecycle_guard
BEFORE INSERT OR UPDATE ON pay54.paytag_registry
FOR EACH ROW EXECUTE FUNCTION pay54.paytag_lifecycle_guard();

CREATE FUNCTION pay54.paytag_registry_audit_append()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, pay54
AS $body$
BEGIN
  INSERT INTO pay54.paytag_registry_audit
    (audit_id,tag_id,owner_account_id,owner_principal_id,
     event_kind,correlation_id,alias_version)
  VALUES
    (gen_random_uuid(),NEW.tag_id,NEW.owner_account_id,NEW.owner_principal_id,
     CASE WHEN TG_OP = 'INSERT' THEN 'CLAIMED'
          WHEN NEW.registry_state = 'ACTIVE' THEN 'ACTIVATED'
          ELSE 'RETIRED' END,
     gen_random_uuid(),NEW.registry_version);
  RETURN NULL;
END
$body$;

CREATE TRIGGER paytag_registry_audit_append_trigger
AFTER INSERT OR UPDATE ON pay54.paytag_registry
FOR EACH ROW EXECUTE FUNCTION pay54.paytag_registry_audit_append();

CREATE FUNCTION pay54.paytag_registry_delete_deny()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, pay54
AS $body$
BEGIN
  RAISE EXCEPTION 'PAY54_PAYTAG_DELETE_DENIED';
END
$body$;

CREATE TRIGGER paytag_registry_delete_deny_trigger
BEFORE DELETE ON pay54.paytag_registry
FOR EACH ROW EXECUTE FUNCTION pay54.paytag_registry_delete_deny();
CREATE TRIGGER paytag_registry_audit_immutable_trigger
BEFORE UPDATE OR DELETE ON pay54.paytag_registry_audit
FOR EACH ROW EXECUTE FUNCTION pay54.paytag_registry_delete_deny();

-- Posture remains default-deny, including database owners under FORCE RLS.
ALTER TABLE pay54.paytag_registry FORCE ROW LEVEL SECURITY;
ALTER TABLE pay54.paytag_registry_audit FORCE ROW LEVEL SECURITY;
REVOKE ALL ON pay54.paytag_registry FROM PUBLIC;
REVOKE ALL ON pay54.paytag_registry_audit FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION pay54.paytag_lifecycle_guard() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION pay54.paytag_registry_audit_append() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION pay54.paytag_registry_delete_deny() FROM PUBLIC;
COMMIT;
