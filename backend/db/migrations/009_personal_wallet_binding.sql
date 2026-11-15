-- ============================================================================
-- PAY54 BATCH 02 / MIGRATION 009 — EXPLICIT LEGACY PERSONAL WALLET BINDING
-- PostgreSQL 16+, requires migrations 001-008.
-- No data copied, no wallet automatically linked, no posting path changed.
-- No application grants, financial execution or production migration approved.
-- ============================================================================
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
BEGIN
    IF to_regclass('pay54.wallets') IS NULL
        OR to_regclass('pay54.account_contexts') IS NULL
        OR to_regclass('pay54.account_memberships') IS NULL
    THEN
        RAISE EXCEPTION 'PAY54 account and wallet foundations required';
    END IF;
    IF to_regclass('pay54.personal_wallet_bindings') IS NOT NULL THEN
        RAISE EXCEPTION 'Personal wallet bindings table already exists';
    END IF;
END;
$$;

-- Legacy customer wallet owners are identity subjects, not business accounts.
-- Only explicit verified PERSONAL account ownership can map an existing wallet.
-- Future BUSINESS wallet ownership requires its own approved architecture.
CREATE TABLE pay54.personal_wallet_bindings (
    wallet_id UUID PRIMARY KEY
        REFERENCES pay54.wallets(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL
        REFERENCES pay54.account_contexts(id) ON DELETE RESTRICT,
    bound_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT binding_wallet_account_unique UNIQUE (wallet_id, account_id)
);

CREATE INDEX personal_wallet_bindings_account_idx
    ON pay54.personal_wallet_bindings (account_id);

CREATE FUNCTION pay54.validate_personal_wallet_binding()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, pay54
AS $$
DECLARE
    v_wallet_owner UUID;
    v_owner UUID;
    v_type VARCHAR(12);
    v_status VARCHAR(24);
    v_verification VARCHAR(16);
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Wallet bindings require a separately reviewed reversal';
    END IF;
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Wallet bindings are immutable';
    END IF;

    SELECT w.owner_subject INTO v_wallet_owner
      FROM pay54.wallets w WHERE w.id = NEW.wallet_id FOR SHARE;
    SELECT a.legal_owner_subject, a.account_type, a.status, a.verification_status
      INTO v_owner, v_type, v_status, v_verification
      FROM pay54.account_contexts a WHERE a.id = NEW.account_id FOR SHARE;

    IF v_wallet_owner IS NULL OR v_owner IS NULL
       OR v_wallet_owner <> v_owner OR v_type <> 'PERSONAL'
       OR v_status <> 'ACTIVE' OR v_verification <> 'VERIFIED'
       OR NOT EXISTS (
           SELECT 1 FROM pay54.account_memberships m
           WHERE m.account_id = NEW.account_id
             AND m.principal_subject = v_wallet_owner
             AND m.role = 'PERSONAL_OWNER'
             AND m.status = 'ACTIVE'
       )
    THEN
        RAISE EXCEPTION 'Wallet/account identity, verification or membership mismatch';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER personal_wallet_binding_guard
BEFORE INSERT OR UPDATE OR DELETE ON pay54.personal_wallet_bindings
FOR EACH ROW EXECUTE FUNCTION pay54.validate_personal_wallet_binding();

-- A wallet binding can never grant read, write or execute privileges.
ALTER TABLE pay54.personal_wallet_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54.personal_wallet_bindings FORCE ROW LEVEL SECURITY;
REVOKE ALL ON pay54.personal_wallet_bindings FROM PUBLIC;
REVOKE ALL ON pay54.personal_wallet_bindings FROM pay54_financial_app_role;
REVOKE ALL ON pay54.personal_wallet_bindings FROM pay54_financial_audit_role;
REVOKE ALL ON pay54.personal_wallet_bindings FROM pay54_ledger_executor_role;
REVOKE EXECUTE ON FUNCTION pay54.validate_personal_wallet_binding() FROM PUBLIC;

-- No INSERTs, wallet repointing, ledger amendments, payment permissions or roles.
COMMIT;
