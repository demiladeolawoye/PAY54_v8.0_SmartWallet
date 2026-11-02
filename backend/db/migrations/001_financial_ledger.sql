
-- ============================================================================
-- PAY54 ENTERPRISE FINANCIAL LEDGER
-- File: backend/db/migrations/001_financial_ledger.sql
-- Version: 1.0.0
-- Work package: WP-P54-BACKEND-001C
--
-- PostgreSQL 15+
--
-- Database foundation only. This migration creates no funds, payment
-- instructions, customer records, provider connections or demo balances.
--
-- Financial execution remains disabled until trusted posting services,
-- access controls, concurrency handling and reconciliation are validated.
-- ============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS pay54;

-- ============================================================================
-- SUPPORTED CURRENCIES
-- ============================================================================

CREATE TABLE pay54.currencies (
    code VARCHAR(3) PRIMARY KEY,
    exponent SMALLINT NOT NULL
        CHECK (exponent BETWEEN 0 AND 4),
    active BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT currency_code_format
        CHECK (code ~ '^[A-Z]{3}$')
);

INSERT INTO pay54.currencies (code, exponent, active)
VALUES
    ('NGN', 2, FALSE),
    ('GBP', 2, FALSE),
    ('USD', 2, FALSE),
    ('EUR', 2, FALSE),
    ('GHS', 2, FALSE),
    ('KES', 2, FALSE),
    ('ZAR', 2, FALSE);

-- Active means operationally approved, not merely represented.
-- All currencies deliberately begin inactive.

-- ============================================================================
-- CUSTOMER WALLETS
-- ============================================================================

CREATE TABLE pay54.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_subject UUID NOT NULL,
    market_code VARCHAR(2) NOT NULL
        CHECK (market_code ~ '^[A-Z]{2}$'),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN (
            'PENDING',
            'ACTIVE',
            'SUSPENDED',
            'CLOSED'
        )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT wallet_identity
        UNIQUE (id, owner_subject)
);

CREATE INDEX wallets_owner_idx
    ON pay54.wallets (owner_subject);

-- ============================================================================
-- FINANCIAL ACCOUNTS
--
-- Account balances are derived from immutable posted ledger entries.
-- Client-submitted balance figures are never authoritative.
-- ============================================================================

CREATE TABLE pay54.ledger_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    wallet_id UUID REFERENCES pay54.wallets(id),

    currency VARCHAR(3) NOT NULL
        REFERENCES pay54.currencies(code),

    account_class VARCHAR(24) NOT NULL
        CHECK (account_class IN (
            'CUSTOMER_LIABILITY',
            'PROVIDER_CLEARING',
            'SETTLEMENT',
            'FEES',
            'REVENUE',
            'SUSPENSE',
            'OTHER_ASSET',
            'OTHER_LIABILITY'
        )),

    account_reference VARCHAR(160) NOT NULL UNIQUE,

    status VARCHAR(16) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'FROZEN', 'CLOSED')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ledger_account_currency_key
        UNIQUE (id, currency),

    CONSTRAINT customer_account_wallet_required
        CHECK (
            account_class <> 'CUSTOMER_LIABILITY'
            OR wallet_id IS NOT NULL
        )
);

CREATE INDEX ledger_accounts_wallet_idx
    ON pay54.ledger_accounts (wallet_id);

-- ============================================================================
-- FINANCIAL OPERATIONS
-- ============================================================================

CREATE TABLE pay54.financial_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    owner_subject UUID NOT NULL,

    kind VARCHAR(32) NOT NULL
        CHECK (kind IN (
            'WALLET_TRANSFER',
            'BANK_PAYOUT'
        )),

    state VARCHAR(24) NOT NULL DEFAULT 'RECEIVED'
        CHECK (state IN (
            'RECEIVED',
            'VALIDATING',
            'REJECTED',
            'RESERVED',
            'SUBMITTED',
            'PROVIDER_UNKNOWN',
            'SETTLED',
            'FAILED',
            'REVERSAL_PENDING',
            'REVERSED'
        )),

    currency VARCHAR(3) NOT NULL
        REFERENCES pay54.currencies(code),

    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),

    correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX financial_operations_owner_idx
    ON pay54.financial_operations (owner_subject, created_at DESC);

CREATE INDEX financial_operations_state_idx
    ON pay54.financial_operations (state);

-- ============================================================================
-- IDEMPOTENCY RECORDS
--
-- A trusted service must atomically claim each key and persist the
-- request digest and operation reference in the same database transaction.
-- ============================================================================

CREATE TABLE pay54.idempotency_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    owner_subject UUID NOT NULL,

    idempotency_key VARCHAR(128) NOT NULL,

    request_digest VARCHAR(64) NOT NULL
        CHECK (request_digest ~ '^[0-9a-f]{64}$'),

    operation_id UUID NOT NULL
        REFERENCES pay54.financial_operations(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT idempotency_owner_key_unique
        UNIQUE (owner_subject, idempotency_key)
);

CREATE UNIQUE INDEX idempotency_operation_unique
    ON pay54.idempotency_records (operation_id);

-- ============================================================================
-- JOURNALS
--
-- A journal begins in DRAFT, receives its entries, and is subsequently
-- moved to POSTED inside a trusted database transaction.
-- ============================================================================

CREATE TABLE pay54.ledger_journals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    operation_id UUID
        REFERENCES pay54.financial_operations(id),

    journal_type VARCHAR(24) NOT NULL
        CHECK (journal_type IN (
            'TRANSFER',
            'FUNDING',
            'PAYOUT',
            'FEE',
            'SETTLEMENT',
            'REVERSAL',
            'ADJUSTMENT'
        )),

    status VARCHAR(12) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'POSTED')),

    reverses_journal_id UUID UNIQUE
        REFERENCES pay54.ledger_journals(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    posted_at TIMESTAMPTZ,

    CONSTRAINT valid_journal_posted_time
        CHECK (
            (status = 'DRAFT' AND posted_at IS NULL)
            OR
            (status = 'POSTED' AND posted_at IS NOT NULL)
        ),

    CONSTRAINT journal_cannot_reverse_itself
        CHECK (
            reverses_journal_id IS NULL
            OR reverses_journal_id <> id
        )
);

CREATE INDEX journals_operation_idx
    ON pay54.ledger_journals (operation_id);

-- ============================================================================
-- IMMUTABLE LEDGER ENTRIES
--
-- Signed minor-unit deltas:
--   Positive = increase in this account's recorded balance.
--   Negative = decrease in this account's recorded balance.
--
-- Every posted journal must have at least two entries and net to zero
-- separately for each currency.
-- ============================================================================

CREATE TABLE pay54.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    journal_id UUID NOT NULL
        REFERENCES pay54.ledger_journals(id),

    account_id UUID NOT NULL,

    currency VARCHAR(3) NOT NULL,

    amount_minor BIGINT NOT NULL CHECK (amount_minor <> 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ledger_entry_account_currency_fk
        FOREIGN KEY (account_id, currency)
        REFERENCES pay54.ledger_accounts(id, currency)
);

CREATE INDEX ledger_entries_journal_idx
    ON pay54.ledger_entries (journal_id);

CREATE INDEX ledger_entries_account_idx
    ON pay54.ledger_entries (account_id);

-- ============================================================================
-- POSTED JOURNAL IMMUTABILITY
-- ============================================================================

CREATE FUNCTION pay54.guard_ledger_journal()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION
            'Ledger journals cannot be deleted';
    END IF;

    IF OLD.status = 'POSTED' THEN
        RAISE EXCEPTION
            'Posted ledger journals are immutable';
    END IF;

    IF NEW.status = 'DRAFT'
       AND NEW.posted_at IS NOT NULL THEN
        RAISE EXCEPTION
            'Draft journal cannot have a posted timestamp';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER ledger_journal_immutable
BEFORE UPDATE OR DELETE ON pay54.ledger_journals
FOR EACH ROW
EXECUTE FUNCTION pay54.guard_ledger_journal();

CREATE FUNCTION pay54.guard_ledger_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    parent_status VARCHAR(12);
BEGIN
    IF TG_OP <> 'INSERT' THEN
        RAISE EXCEPTION
            'Ledger entries cannot be updated or deleted';
    END IF;

    SELECT status INTO parent_status
    FROM pay54.ledger_journals
    WHERE id = NEW.journal_id
    FOR UPDATE;

    IF parent_status IS DISTINCT FROM 'DRAFT' THEN
        RAISE EXCEPTION
            'Entries can only be inserted into draft journals';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER ledger_entry_immutable
BEFORE INSERT OR UPDATE OR DELETE ON pay54.ledger_entries
FOR EACH ROW
EXECUTE FUNCTION pay54.guard_ledger_entry();

-- ============================================================================
-- DEFERRED BALANCING CONTROL
--
-- Checks the final transaction state, rather than intermediate entries.
-- A posted journal must balance independently in every currency.
-- ============================================================================

CREATE FUNCTION pay54.verify_posted_journal()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    entry_count BIGINT;
    invalid_currency_count BIGINT;
BEGIN
    IF NEW.status <> 'POSTED' THEN
        RETURN NULL;
    END IF;

    SELECT COUNT(*)
    INTO entry_count
    FROM pay54.ledger_entries
    WHERE journal_id = NEW.id;

    IF entry_count < 2 THEN
        RAISE EXCEPTION
            'Posted journal % requires at least two entries',
            NEW.id;
    END IF;

    SELECT COUNT(*)
    INTO invalid_currency_count
    FROM (
        SELECT currency
        FROM pay54.ledger_entries
        WHERE journal_id = NEW.id
        GROUP BY currency
        HAVING SUM(amount_minor::NUMERIC) <> 0
    ) AS unbalanced;

    IF invalid_currency_count > 0 THEN
        RAISE EXCEPTION
            'Posted journal % is not balanced by currency',
            NEW.id;
    END IF;

    IF NEW.reverses_journal_id IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM pay54.ledger_journals original
           WHERE original.id = NEW.reverses_journal_id
             AND original.status = 'POSTED'
       ) THEN
        RAISE EXCEPTION
            'Reversal must reference an already posted journal';
    END IF;

    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER ledger_posting_integrity
AFTER INSERT OR UPDATE ON pay54.ledger_journals
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION pay54.verify_posted_journal();

-- ============================================================================
-- RESERVATIONS
--
-- Reservations are not postings. Future trusted services must use
-- serialised account-level balance checks to prevent overspending.
-- ============================================================================

CREATE TABLE pay54.balance_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    operation_id UUID NOT NULL UNIQUE
        REFERENCES pay54.financial_operations(id),

    account_id UUID NOT NULL,

    currency VARCHAR(3) NOT NULL,

    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),

    status VARCHAR(16) NOT NULL DEFAULT 'HELD'
        CHECK (status IN (
            'HELD',
            'CAPTURED',
            'RELEASED',
            'EXPIRED'
        )),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    expires_at TIMESTAMPTZ NOT NULL,

    CONSTRAINT reservation_account_currency_fk
        FOREIGN KEY (account_id, currency)
        REFERENCES pay54.ledger_accounts(id, currency),

    CONSTRAINT reservation_expiry_valid
        CHECK (expires_at > created_at)
);

CREATE INDEX reservations_active_account_idx
    ON pay54.balance_reservations (account_id)
    WHERE status = 'HELD';

-- ============================================================================
-- PROVIDER ATTEMPTS AND RECONCILIATION
-- ============================================================================

CREATE TABLE pay54.provider_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    operation_id UUID NOT NULL
        REFERENCES pay54.financial_operations(id),

    provider_code VARCHAR(80) NOT NULL,

    provider_reference VARCHAR(180),

    state VARCHAR(24) NOT NULL DEFAULT 'PENDING'
        CHECK (state IN (
            'PENDING',
            'SUBMITTED',
            'UNKNOWN',
            'CONFIRMED',
            'REJECTED',
            'RECONCILED'
        )),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT provider_attempt_unique_reference
        UNIQUE (provider_code, provider_reference)
);

CREATE INDEX provider_attempts_operation_idx
    ON pay54.provider_attempts (operation_id);

CREATE TABLE pay54.reconciliation_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    provider_attempt_id UUID NOT NULL
        REFERENCES pay54.provider_attempts(id),

    external_reference VARCHAR(180) NOT NULL,

    outcome VARCHAR(24) NOT NULL
        CHECK (outcome IN (
            'MATCHED',
            'MISSING_INTERNAL',
            'MISSING_EXTERNAL',
            'AMOUNT_MISMATCH',
            'CURRENCY_MISMATCH',
            'UNDER_REVIEW'
        )),

    observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT reconciliation_provider_external_unique
        UNIQUE (provider_attempt_id, external_reference)
);

-- ============================================================================
-- TRANSACTIONAL OUTBOX
--
-- Future workers may publish events only after database commit.
-- ============================================================================

CREATE TABLE pay54.outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    event_type VARCHAR(120) NOT NULL,

    aggregate_id UUID NOT NULL,

    payload JSONB NOT NULL
        CHECK (jsonb_typeof(payload) = 'object'),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    published_at TIMESTAMPTZ
);

CREATE INDEX outbox_unpublished_idx
    ON pay54.outbox_events (created_at)
    WHERE published_at IS NULL;

-- ============================================================================
-- READ-ONLY POSTED BALANCE VIEW
--
-- This reports posted signed balances. It does NOT calculate spendable
-- balance or net reservations. That belongs to trusted ledger services.
-- ============================================================================

CREATE VIEW pay54.posted_account_balances AS
SELECT
    a.id AS account_id,
    a.wallet_id,
    a.currency,
    a.account_class,
    COALESCE(
        SUM(e.amount_minor::NUMERIC)
            FILTER (WHERE j.status = 'POSTED'),
        0::NUMERIC
    ) AS posted_minor
FROM pay54.ledger_accounts a
LEFT JOIN pay54.ledger_entries e
    ON e.account_id = a.id
LEFT JOIN pay54.ledger_journals j
    ON j.id = e.journal_id
GROUP BY
    a.id,
    a.wallet_id,
    a.currency,
    a.account_class;

COMMIT;
