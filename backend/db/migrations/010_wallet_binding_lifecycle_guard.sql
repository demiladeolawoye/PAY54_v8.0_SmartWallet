-- PAY54 ENTERPRISE BATCH 03 — MIGRATION 010
-- Source-only wallet binding lifecycle invariants; PostgreSQL 16+.
-- Depends on migrations 001–009. No data migration, grants or postings.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
BEGIN
  IF to_regclass('pay54.wallets') IS NULL
     OR to_regclass('pay54.personal_wallet_bindings') IS NULL
     OR to_regclass('pay54.account_memberships') IS NULL
  THEN
    RAISE EXCEPTION 'Migrations 001–009 must precede lifecycle guard';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='wallet_bound_owner_immutable' AND tgrelid='pay54.wallets'::regclass)
  THEN
    RAISE EXCEPTION 'Wallet owner lifecycle guard already exists; review migration state';
  END IF;
END;
$$;

-- Existing unbound legacy wallets remain unchanged; only wallet IDs explicitly
-- linked to a verified PERSONAL account are protected. Linking must be approved
-- independently, and this migration links no wallets.
CREATE FUNCTION pay54.guard_bound_wallet_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, pay54
AS $$
BEGIN
  IF OLD.owner_subject IS DISTINCT FROM NEW.owner_subject
     AND EXISTS (
       SELECT 1 FROM pay54.personal_wallet_bindings b
        WHERE b.wallet_id=OLD.id
     )
  THEN
    RAISE EXCEPTION 'Bound wallet owner subject is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER wallet_bound_owner_immutable
BEFORE UPDATE OF owner_subject ON pay54.wallets
FOR EACH ROW EXECUTE FUNCTION pay54.guard_bound_wallet_owner();

-- A wallet may be suspended/closed using pre-existing status controls. The
-- binding is preserved for audit but is never itself proof of current access.
-- Every read must re-check account, membership and wallet status at request time.
-- No change to ledger_entries, financial_operations or posting functions.
REVOKE EXECUTE ON FUNCTION pay54.guard_bound_wallet_owner() FROM PUBLIC;
COMMIT;
