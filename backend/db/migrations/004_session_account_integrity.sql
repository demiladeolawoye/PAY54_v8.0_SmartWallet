-- PAY54 Batch 22 / 841: protect trusted session active-account assignment.
-- Prevent a session from selecting an account without an active membership.
-- This is a DB integrity gate, not proof of client authentication.
BEGIN;

CREATE OR REPLACE FUNCTION pay54.enforce_session_account_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, pay54
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND
     NEW.principal_id IS DISTINCT FROM OLD.principal_id THEN
    RAISE EXCEPTION 'PAY54_SESSION_PRINCIPAL_IMMUTABLE' USING ERRCODE='23514';
  END IF;

  IF NEW.active_account_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pay54.accounts a
    JOIN pay54.account_memberships m ON m.account_id = a.account_id
    WHERE a.account_id = NEW.active_account_id
      AND m.principal_id = NEW.principal_id
      AND a.account_status = 'ACTIVE'
      AND a.verification_status = 'VERIFIED'
      AND m.member_status = 'ACTIVE'
      AND (a.account_type = 'BUSINESS' OR
           (a.account_type = 'PERSONAL' AND
            m.member_role='PERSONAL_OWNER' AND
            a.legal_owner_id=NEW.principal_id))
  ) THEN
    RAISE EXCEPTION 'PAY54_SESSION_ACCOUNT_MEMBERSHIP_DENIED'
      USING ERRCODE='23514';
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS pay54_session_account_integrity ON pay54.auth_sessions;
CREATE TRIGGER pay54_session_account_integrity
  BEFORE INSERT OR UPDATE OF principal_id,active_account_id
  ON pay54.auth_sessions
  FOR EACH ROW EXECUTE FUNCTION pay54.enforce_session_account_membership();

COMMIT;
