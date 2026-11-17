-- PAY54 Batch 22 / 838: membership type and legal owner integrity.
-- Applies after migrations 001 and 002. Does not grant runtime privileges.
BEGIN;

CREATE OR REPLACE FUNCTION pay54.enforce_account_membership_integrity()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, pay54
AS $$
DECLARE
  expected_type text;
  expected_owner uuid;
BEGIN
  SELECT account_type, legal_owner_id INTO expected_type, expected_owner
    FROM pay54.accounts WHERE account_id = NEW.account_id;
  IF expected_type IS NULL THEN
    RAISE EXCEPTION 'PAY54_MEMBERSHIP_ACCOUNT_MISSING' USING ERRCODE = '23514';
  END IF;
  IF expected_type = 'PERSONAL' AND (
      NEW.member_role <> 'PERSONAL_OWNER' OR
      NEW.principal_id <> expected_owner
  ) THEN
    RAISE EXCEPTION 'PAY54_INVALID_PERSONAL_MEMBERSHIP' USING ERRCODE = '23514';
  END IF;
  IF expected_type = 'BUSINESS' AND NEW.member_role = 'PERSONAL_OWNER' THEN
    RAISE EXCEPTION 'PAY54_INVALID_BUSINESS_MEMBERSHIP' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS pay54_membership_type_integrity ON pay54.account_memberships;
CREATE TRIGGER pay54_membership_type_integrity
  BEFORE INSERT OR UPDATE OF account_id,principal_id,member_role
  ON pay54.account_memberships
  FOR EACH ROW EXECUTE FUNCTION pay54.enforce_account_membership_integrity();

CREATE OR REPLACE FUNCTION pay54.protect_account_legal_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, pay54
AS $$
BEGIN
  IF NEW.account_type IS DISTINCT FROM OLD.account_type OR
     NEW.legal_owner_id IS DISTINCT FROM OLD.legal_owner_id THEN
    RAISE EXCEPTION 'PAY54_ACCOUNT_IDENTITY_IMMUTABLE' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS pay54_account_identity_protected ON pay54.accounts;
CREATE TRIGGER pay54_account_identity_protected
  BEFORE UPDATE OF account_type,legal_owner_id ON pay54.accounts
  FOR EACH ROW EXECUTE FUNCTION pay54.protect_account_legal_identity();

COMMIT;
