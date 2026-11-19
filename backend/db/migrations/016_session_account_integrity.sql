-- PAY54 Batch 22 / replacement 841 — migration 016.
-- Extend canonical membership and account-context integrity to sessions.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';

DO $$
BEGIN
  IF to_regclass('pay54.auth_sessions') IS NULL OR
     to_regclass('pay54.account_contexts') IS NULL OR
     to_regclass('pay54.account_memberships') IS NULL THEN
    RAISE EXCEPTION 'PAY54_CANONICAL_SESSION_ACCOUNT_FOUNDATIONS_REQUIRED';
  END IF;
END
$$;

CREATE FUNCTION pay54.enforce_session_account_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path=pg_catalog,pay54
AS $$
BEGIN
  IF TG_OP='UPDATE' AND
     NEW.principal_id IS DISTINCT FROM OLD.principal_id THEN
    RAISE EXCEPTION 'PAY54_SESSION_PRINCIPAL_IMMUTABLE' USING ERRCODE='23514';
  END IF;

  IF NEW.active_account_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
      FROM pay54.account_contexts a
      JOIN pay54.account_memberships m ON m.account_id=a.id
     WHERE a.id=NEW.active_account_id
       AND m.principal_subject=NEW.principal_id
       AND a.status='ACTIVE'
       AND a.verification_status='VERIFIED'
       AND m.status='ACTIVE'
       AND (a.account_type='BUSINESS' OR
            (a.account_type='PERSONAL' AND
             m.role='PERSONAL_OWNER' AND
             a.legal_owner_subject=NEW.principal_id))
  ) THEN
    RAISE EXCEPTION 'PAY54_SESSION_ACCOUNT_MEMBERSHIP_DENIED'
      USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER pay54_session_account_integrity
  BEFORE INSERT OR UPDATE OF principal_id,active_account_id
  ON pay54.auth_sessions
  FOR EACH ROW EXECUTE FUNCTION pay54.enforce_session_account_membership();

REVOKE EXECUTE ON FUNCTION pay54.enforce_session_account_membership()
 FROM PUBLIC;
COMMIT;
