
-- ============================================================================
-- PAY54 ENTERPRISE LEDGER INTEGRITY HARDENING
-- File: backend/db/migrations/002_ledger_integrity_hardening.sql
-- Version: 1.0.0
-- Work Package: WP-P54-BACKEND-001C.2
--
-- PostgreSQL 15+
-- Requires migration 001_financial_ledger.sql
--
-- Responsibilities:
--   * Preserve balanced, immutable posted journals.
--   * Verify exact inverse entries for full reversals.
--   * Reject reversals of draft journals and other reversals.
--   * Ensure reversal references are used only by reversal journals.
--   * Remove implicit PUBLIC privileges from the financial schema.
--
-- Deployment:
--   * Execute only in an isolated, disposable database initially.
--   * Migration must run as the authorised schema owner.
--   * Application-role grants require a separate deployment review.
--
-- No customer, wallet, operation or financial posting is created.
-- ============================================================================

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
BEGIN
    IF to_regclass('pay54.ledger_journals') IS NULL
       OR to_regclass('pay54.ledger_entries') IS NULL
       OR to_regclass('pay54.ledger_accounts') IS NULL
    THEN
        RAISE EXCEPTION
            'PAY54 migration 001 must be installed first';
    END IF;
END;
$$;

-- ============================================================================
-- JOURNAL INTEGRITY CHECK
--
-- Replaces the implementation of the existing deferred trigger function.
-- It retains the trigger name and the original function signature.
--
-- Exact inverse means:
--   for each entry in the original journal, the reversal has an entry
--   with the same account, same currency and opposite amount.
--
-- Duplicate entries must match in number as well.
--
-- This prevents a merely balanced but economically different journal
-- from being described as an exact reversal.
-- ============================================================================

CREATE OR REPLACE FUNCTION pay54.verify_posted_journal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pay54
AS $$
DECLARE
    entry_count BIGINT;
    invalid_currency_count BIGINT;
    original_status VARCHAR(12);
    original_type VARCHAR(24);
    inverse_mismatch_count BIGINT;
BEGIN
    IF NEW.status <> 'POSTED' THEN
        RETURN NULL;
    END IF;

    -- A posted journal requires at least two actual entries.

    SELECT COUNT(*)
    INTO entry_count
    FROM pay54.ledger_entries
    WHERE journal_id = NEW.id;

    IF entry_count < 2 THEN
        RAISE EXCEPTION
            'Posted journal % requires at least two entries',
            NEW.id;
    END IF;

    -- All posted journals must balance independently per currency.

    SELECT COUNT(*)
    INTO invalid_currency_count
    FROM (
        SELECT currency
        FROM pay54.ledger_entries
        WHERE journal_id = NEW.id
        GROUP BY currency
        HAVING SUM(amount_minor::NUMERIC) <> 0
    ) AS unbalanced;

    IF invalid_currency_count <> 0 THEN
        RAISE EXCEPTION
            'Posted journal % is not balanced by currency',
            NEW.id;
    END IF;

    -- Reversal references are only valid on reversal journals.

    IF NEW.journal_type <> 'REVERSAL'
       AND NEW.reverses_journal_id IS NOT NULL
    THEN
        RAISE EXCEPTION
            'Only reversal journals may reference an original journal';
    END IF;

    IF NEW.journal_type <> 'REVERSAL' THEN
        RETURN NULL;
    END IF;

    -- Every full reversal must identify its original journal.

    IF NEW.reverses_journal_id IS NULL THEN
        RAISE EXCEPTION
            'Reversal journal requires an original journal';
    END IF;

    -- The referenced journal must already exist and be posted.

    SELECT original.status, original.journal_type
    INTO original_status, original_type
    FROM pay54.ledger_journals AS original
    WHERE original.id = NEW.reverses_journal_id
    FOR SHARE;

    IF original_status IS DISTINCT FROM 'POSTED' THEN
        RAISE EXCEPTION
            'Reversal must reference an already posted journal';
    END IF;

    -- A reversal of another reversal requires a separately designed
    -- correction process and is deliberately prohibited.

    IF original_type = 'REVERSAL' THEN
        RAISE EXCEPTION
            'A reversal journal cannot reverse another reversal';
    END IF;

    -- Compare each original posting against the exact opposing
    -- posting in the reversal. Count duplicates explicitly.
    --
    -- NUMERIC negation avoids BIGINT overflow for extreme values.
    --
    -- The FULL OUTER JOIN detects:
    --   * original entries omitted from the reversal
    --   * additional entries in the reversal
    --   * incorrect accounts
    --   * incorrect currencies
    --   * incorrect amounts
    --   * incorrect entry multiplicity

    SELECT COUNT(*)
    INTO inverse_mismatch_count
    FROM (
        SELECT
            e.account_id,
            e.currency,
            e.amount_minor::NUMERIC AS amount,
            COUNT(*) AS entry_count
        FROM pay54.ledger_entries AS e
        WHERE e.journal_id = NEW.reverses_journal_id
        GROUP BY
            e.account_id,
            e.currency,
            e.amount_minor
    ) AS original_entries
    FULL OUTER JOIN (
        SELECT
            e.account_id,
            e.currency,
            -(e.amount_minor::NUMERIC) AS amount,
            COUNT(*) AS entry_count
        FROM pay54.ledger_entries AS e
        WHERE e.journal_id = NEW.id
        GROUP BY
            e.account_id,
            e.currency,
            e.amount_minor
    ) AS reversal_entries
        ON original_entries.account_id =
           reversal_entries.account_id
       AND original_entries.currency =
           reversal_entries.currency
       AND original_entries.amount =
           reversal_entries.amount
    WHERE
        original_entries.account_id IS NULL
        OR reversal_entries.account_id IS NULL
        OR original_entries.entry_count <>
           reversal_entries.entry_count;

    IF inverse_mismatch_count <> 0 THEN
        RAISE EXCEPTION
            'Reversal entries do not exactly invert original journal %',
            NEW.reverses_journal_id;
    END IF;

    RETURN NULL;
END;
$$;

-- The existing ledger_posting_integrity constraint trigger created
-- in migration 001 continues to call this function.
--
-- Ensure the trigger exists rather than silently accepting a database
-- where its financial-integrity enforcement is missing.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger AS t
        JOIN pg_class AS c
          ON c.oid = t.tgrelid
        JOIN pg_namespace AS n
          ON n.oid = c.relnamespace
        WHERE n.nspname = 'pay54'
          AND c.relname = 'ledger_journals'
          AND t.tgname = 'ledger_posting_integrity'
          AND NOT t.tgisinternal
          AND t.tgenabled = 'O'
          AND (t.tgconstraint <> 0)
    ) THEN
        RAISE EXCEPTION
            'PAY54 deferred ledger integrity trigger is missing or inactive';
    END IF;
END;
$$;

-- ============================================================================
-- MINIMUM SCHEMA PRIVILEGE HARDENING
--
-- The migration account remains owner of its objects.
-- No broad runtime application privileges are granted.
--
-- IMPORTANT:
--   PostgreSQL object owners and superusers can still bypass or alter
--   protections. Runtime services must not use schema-owner credentials.
-- ============================================================================

REVOKE ALL ON SCHEMA pay54 FROM PUBLIC;

REVOKE ALL ON ALL TABLES
IN SCHEMA pay54 FROM PUBLIC;

REVOKE ALL ON ALL SEQUENCES
IN SCHEMA pay54 FROM PUBLIC;

REVOKE EXECUTE ON ALL FUNCTIONS
IN SCHEMA pay54 FROM PUBLIC;

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default.
-- Change the migration owner's defaults for future functions created
-- in this schema.

ALTER DEFAULT PRIVILEGES IN SCHEMA pay54
REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- This migration does not create application or reporting roles.
-- Those must be provisioned and tested separately with least-privilege
-- grants, subject to the selected hosting and identity infrastructure.

COMMIT;
