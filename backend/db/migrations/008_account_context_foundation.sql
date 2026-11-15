-- ============================================================================
-- PAY54 ENTERPRISE — PERSONAL/BUSINESS ACCOUNT CONTEXT FOUNDATION
-- Migration 008 / PostgreSQL 16+
--
-- Standalone source-only migration. Requires 001–007. Does not create a
-- customer, wallet, balance, payment, login role, or grant financial access.
-- This is NOT automatically deployed or applied to any PAY54 environment.
-- ============================================================================
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
BEGIN
    IF to_regclass('pay54.wallets') IS NULL
       OR to_regclass('pay54.ledger_entries') IS NULL
       OR to_regclass('pay54.financial_operations') IS NULL
       OR NOT EXISTS (
           SELECT 1 FROM pg_roles
           WHERE rolname = 'pay54_ledger_executor_role'
       )
    THEN
        RAISE EXCEPTION 'PAY54 account context requires validated migrations 001-007';
    END IF;
    IF to_regclass('pay54.account_contexts') IS NOT NULL
       OR to_regclass('pay54.account_memberships') IS NOT NULL
    THEN
        RAISE EXCEPTION 'PAY54 account context already exists; manual migration review required';
    END IF;
END;
$$;

-- The legal owner is an identity subject, not the ID of a financial account.
-- Business verification must be performed by separately approved KYB services.
CREATE TABLE pay54.account_contexts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_owner_subject UUID NOT NULL,
    account_type VARCHAR(12) NOT NULL
        CHECK (account_type IN ('PERSONAL', 'BUSINESS')),
    display_name VARCHAR(120) NOT NULL
        CHECK (length(btrim(display_name)) BETWEEN 1 AND 120
               AND display_name = btrim(display_name)),
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING_VERIFICATION'
        CHECK (status IN ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'CLOSED')),
    verification_status VARCHAR(16) NOT NULL DEFAULT 'NOT_VERIFIED'
        CHECK (verification_status IN ('NOT_VERIFIED', 'IN_REVIEW', 'VERIFIED', 'REJECTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT account_active_requires_verified
        CHECK (status <> 'ACTIVE' OR verification_status = 'VERIFIED'),
    CONSTRAINT account_context_id_type_unique UNIQUE (id, account_type)
);

CREATE INDEX account_context_legal_owner_idx
    ON pay54.account_contexts (legal_owner_subject, account_type, created_at DESC);

-- Every membership is explicitly scoped to one account, never a global role.
-- PERSONAL_OWNER must match the personal account's legal owner (enforced
-- by a constraint trigger below). Other role combinations fail closed.
CREATE TABLE pay54.account_memberships (
    account_id UUID NOT NULL REFERENCES pay54.account_contexts(id)
        ON DELETE RESTRICT,
    principal_subject UUID NOT NULL,
    role VARCHAR(24) NOT NULL
        CHECK (role IN (
            'PERSONAL_OWNER', 'BUSINESS_OWNER', 'BUSINESS_ADMIN',
            'BUSINESS_OPERATOR', 'BUSINESS_VIEWER'
        )),
    status VARCHAR(12) NOT NULL DEFAULT 'INVITED'
        CHECK (status IN ('INVITED', 'ACTIVE', 'SUSPENDED', 'REVOKED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (account_id, principal_subject)
);

CREATE INDEX account_memberships_principal_idx
    ON pay54.account_memberships (principal_subject, status, account_id);

CREATE FUNCTION pay54.validate_account_membership_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, pay54
AS $$
DECLARE
    account_type_value VARCHAR(12);
    owner_subject_value UUID;
BEGIN
    SELECT a.account_type, a.legal_owner_subject
      INTO account_type_value, owner_subject_value
      FROM pay54.account_contexts a
     WHERE a.id = NEW.account_id
     FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Account context not found';
    END IF;

    IF (account_type_value = 'PERSONAL'
        AND (NEW.role <> 'PERSONAL_OWNER'
             OR NEW.principal_subject <> owner_subject_value))
       OR (account_type_value = 'BUSINESS'
           AND NEW.role = 'PERSONAL_OWNER')
    THEN
        RAISE EXCEPTION 'Membership role and account owner mismatch';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER account_membership_owner_guard
BEFORE INSERT OR UPDATE ON pay54.account_memberships
FOR EACH ROW EXECUTE FUNCTION pay54.validate_account_membership_owner();

-- Prevent type/owner mutation after membership has been established, so
-- the role guard cannot be bypassed through updates to the parent account.
CREATE FUNCTION pay54.guard_account_context_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, pay54
AS $$
BEGIN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.account_type IS DISTINCT FROM OLD.account_type
       OR NEW.legal_owner_subject IS DISTINCT FROM OLD.legal_owner_subject
    THEN
        RAISE EXCEPTION 'Account identity and ownership cannot be reassigned';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER account_context_identity_guard
BEFORE UPDATE ON pay54.account_contexts
FOR EACH ROW EXECUTE FUNCTION pay54.guard_account_context_identity();

-- Row policies are defense-in-depth. They do NOT confer database permissions,
-- and session-provided identity settings alone are NOT authentication.
-- No application, audit, executor or PUBLIC role is granted account access.
ALTER TABLE pay54.account_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54.account_contexts FORCE ROW LEVEL SECURITY;
ALTER TABLE pay54.account_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54.account_memberships FORCE ROW LEVEL SECURITY;

REVOKE ALL ON pay54.account_contexts FROM PUBLIC;
REVOKE ALL ON pay54.account_memberships FROM PUBLIC;
REVOKE ALL ON pay54.account_contexts FROM pay54_financial_app_role;
REVOKE ALL ON pay54.account_contexts FROM pay54_financial_audit_role;
REVOKE ALL ON pay54.account_contexts FROM pay54_ledger_executor_role;
REVOKE ALL ON pay54.account_memberships FROM pay54_financial_app_role;
REVOKE ALL ON pay54.account_memberships FROM pay54_financial_audit_role;
REVOKE ALL ON pay54.account_memberships FROM pay54_ledger_executor_role;

REVOKE EXECUTE ON FUNCTION pay54.validate_account_membership_owner() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION pay54.guard_account_context_identity() FROM PUBLIC;

-- Deliberately no INSERTs, membership grants, RLS bypass roles, wallet links,
-- operations, balance modifications, trust-token functions, or execution rights.
COMMIT;
