
-- ============================================================================
-- PAY54 ENTERPRISE FINANCIAL LEDGER INTEGRITY TESTS
-- File: backend/db/tests/001_financial_ledger_integrity.sql
-- Version: 1.0.0
-- Work Package: WP-P54-BACKEND-001C.1
--
-- Target: PostgreSQL 15+
-- Requires: backend/db/migrations/001_financial_ledger.sql
--
-- Usage:
--   psql -X -v ON_ERROR_STOP=1 -d pay54_test \
--        -f backend/db/tests/001_financial_ledger_integrity.sql
--
-- Run ONLY against an isolated, disposable testing database.
-- All fixture records are rolled back at the end.
-- This is not a concurrent-load or database-permissions test.
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';
SET CONSTRAINTS ALL DEFERRED;

-- ============================================================================
-- REQUIRED SCHEMA CHECKS
-- ============================================================================

DO $$
BEGIN
    IF to_regclass('pay54.currencies') IS NULL
       OR to_regclass('pay54.wallets') IS NULL
       OR to_regclass('pay54.ledger_accounts') IS NULL
       OR to_regclass('pay54.financial_operations') IS NULL
       OR to_regclass('pay54.idempotency_records') IS NULL
       OR to_regclass('pay54.ledger_journals') IS NULL
       OR to_regclass('pay54.ledger_entries') IS NULL
       OR to_regclass('pay54.balance_reservations') IS NULL
       OR to_regclass('pay54.provider_attempts') IS NULL
       OR to_regclass('pay54.reconciliation_records') IS NULL THEN
        RAISE EXCEPTION
            'PAY54 ledger migration is incomplete';
    END IF;

    RAISE NOTICE
        'PASS: Required PAY54 ledger tables exist';
END;
$$;

-- ============================================================================
-- HELPER: EXPECT A DATABASE REJECTION
--
-- Executed SQL must produce the specified PostgreSQL SQLSTATE.
-- The nested exception block rolls back each rejected statement.
-- ============================================================================

CREATE FUNCTION pg_temp.expect_rejection(
    test_name TEXT,
    statement_sql TEXT,
    expected_state TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    actual_state TEXT;
    did_reject BOOLEAN := FALSE;
BEGIN
    BEGIN
        EXECUTE statement_sql;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS
            actual_state = RETURNED_SQLSTATE;

        did_reject := TRUE;
    END;

    IF NOT did_reject THEN
        RAISE EXCEPTION
            'FAIL: % accepted an invalid operation',
            test_name;
    END IF;

    IF actual_state <> expected_state THEN
        RAISE EXCEPTION
            'FAIL: % returned SQLSTATE %, expected %',
            test_name,
            actual_state,
            expected_state;
    END IF;

    RAISE NOTICE
        'PASS: % rejected with SQLSTATE %',
        test_name,
        actual_state;
END;
$$;

-- ============================================================================
-- ISOLATED TEST FIXTURES
-- ============================================================================

CREATE TEMP TABLE pay54_test_ids (
    name TEXT PRIMARY KEY,
    id UUID NOT NULL
) ON COMMIT DROP;

DO $$
DECLARE
    v_owner UUID := gen_random_uuid();
    v_wallet UUID;
    v_asset_account UUID;
    v_liability_account UUID;
    v_gbp_account UUID;
    v_operation UUID;
    v_journal UUID;
    v_draft UUID;
    v_entry UUID;
    v_idempotency_key TEXT :=
        'pay54-ledger-integrity-test-0001';
BEGIN
    -- Create one synthetic customer wallet.
    INSERT INTO pay54.wallets (
        owner_subject,
        market_code,
        status
    )
    VALUES (
        v_owner,
        'NG',
        'PENDING'
    )
    RETURNING id INTO v_wallet;

    -- Two accounts in NGN for a balanced posting.
    INSERT INTO pay54.ledger_accounts (
        currency,
        account_class,
        account_reference
    )
    VALUES (
        'NGN',
        'PROVIDER_CLEARING',
        'test-clearing-' || gen_random_uuid()::TEXT
    )
    RETURNING id INTO v_asset_account;

    INSERT INTO pay54.ledger_accounts (
        wallet_id,
        currency,
        account_class,
        account_reference
    )
    VALUES (
        v_wallet,
        'NGN',
        'CUSTOMER_LIABILITY',
        'test-customer-' || gen_random_uuid()::TEXT
    )
    RETURNING id INTO v_liability_account;

    -- Separate GBP account for currency-integrity testing.
    INSERT INTO pay54.ledger_accounts (
        currency,
        account_class,
        account_reference
    )
    VALUES (
        'GBP',
        'PROVIDER_CLEARING',
        'test-gbp-' || gen_random_uuid()::TEXT
    )
    RETURNING id INTO v_gbp_account;

    INSERT INTO pay54.financial_operations (
        owner_subject,
        kind,
        currency,
        amount_minor
    )
    VALUES (
        v_owner,
        'WALLET_TRANSFER',
        'NGN',
        2500
    )
    RETURNING id INTO v_operation;

    INSERT INTO pay54_test_ids VALUES
        ('owner', v_owner),
        ('wallet', v_wallet),
        ('asset_account', v_asset_account),
        ('liability_account', v_liability_account),
        ('gbp_account', v_gbp_account),
        ('operation', v_operation);

    -- ========================================================================
    -- TEST 1: BALANCED TWO-ENTRY JOURNAL
    -- ========================================================================

    INSERT INTO pay54.ledger_journals (
        operation_id,
        journal_type
    )
    VALUES (
        v_operation,
        'TRANSFER'
    )
    RETURNING id INTO v_journal;

    INSERT INTO pay54.ledger_entries (
        journal_id,
        account_id,
        currency,
        amount_minor
    )
    VALUES
        (v_journal, v_asset_account, 'NGN', -2500),
        (v_journal, v_liability_account, 'NGN', 2500);

    UPDATE pay54.ledger_journals
    SET status = 'POSTED',
        posted_at = now()
    WHERE id = v_journal;

    SET CONSTRAINTS ALL IMMEDIATE;

    IF (
        SELECT COALESCE(SUM(amount_minor::NUMERIC), 0)
        FROM pay54.ledger_entries
        WHERE journal_id = v_journal
    ) <> 0 THEN
        RAISE EXCEPTION
            'FAIL: Balanced journal total is non-zero';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pay54.ledger_journals
        WHERE id = v_journal
          AND status = 'POSTED'
    ) THEN
        RAISE EXCEPTION
            'FAIL: Balanced journal was not posted';
    END IF;

    RAISE NOTICE
        'PASS: Balanced two-entry journal posted';

    INSERT INTO pay54_test_ids
    VALUES ('posted_journal', v_journal);

    -- ========================================================================
    -- TEST 2: POSTED JOURNAL CANNOT BE UPDATED
    -- ========================================================================

    PERFORM pg_temp.expect_rejection(
        'Posted journal modification',
        format(
            'UPDATE pay54.ledger_journals
             SET journal_type = %L
             WHERE id = %L',
            'ADJUSTMENT',
            v_journal
        ),
        'P0001'
    );

    -- ========================================================================
    -- TEST 3: POSTED JOURNAL CANNOT BE DELETED
    -- ========================================================================

    PERFORM pg_temp.expect_rejection(
        'Posted journal deletion',
        format(
            'DELETE FROM pay54.ledger_journals
             WHERE id = %L',
            v_journal
        ),
        'P0001'
    );

    -- ========================================================================
    -- TEST 4: LEDGER ENTRY CANNOT BE UPDATED
    -- ========================================================================

    SELECT id INTO v_entry
    FROM pay54.ledger_entries
    WHERE journal_id = v_journal
    LIMIT 1;

    PERFORM pg_temp.expect_rejection(
        'Ledger entry modification',
        format(
            'UPDATE pay54.ledger_entries
             SET amount_minor = 123
             WHERE id = %L',
            v_entry
        ),
        'P0001'
    );

    -- ========================================================================
    -- TEST 5: LEDGER ENTRY CANNOT BE DELETED
    -- ========================================================================

    PERFORM pg_temp.expect_rejection(
        'Ledger entry deletion',
        format(
            'DELETE FROM pay54.ledger_entries
             WHERE id = %L',
            v_entry
        ),
        'P0001'
    );

    -- ========================================================================
    -- TEST 6: CANNOT APPEND TO POSTED JOURNAL
    -- ========================================================================

    PERFORM pg_temp.expect_rejection(
        'Append entry to posted journal',
        format(
            'INSERT INTO pay54.ledger_entries
             (journal_id, account_id, currency, amount_minor)
             VALUES (%L, %L, %L, 100)',
            v_journal,
            v_asset_account,
            'NGN'
        ),
        'P0001'
    );

    -- ========================================================================
    -- TEST 7: ACCOUNT/CURRENCY MISMATCH
    -- ========================================================================

    INSERT INTO pay54.ledger_journals (
        journal_type
    )
    VALUES ('ADJUSTMENT')
    RETURNING id INTO v_draft;

    PERFORM pg_temp.expect_rejection(
        'Account and entry currency mismatch',
        format(
            'INSERT INTO pay54.ledger_entries
             (journal_id, account_id, currency, amount_minor)
             VALUES (%L, %L, %L, 100)',
            v_draft,
            v_asset_account,
            'GBP'
        ),
        '23503'
    );

    -- ========================================================================
    -- TEST 8: DUPLICATE IDEMPOTENCY KEY
    -- ========================================================================

    INSERT INTO pay54.idempotency_records (
        owner_subject,
        idempotency_key,
        request_digest,
        operation_id
    )
    VALUES (
        v_owner,
        v_idempotency_key,
        repeat('a', 64),
        v_operation
    );

    PERFORM pg_temp.expect_rejection(
        'Duplicate owner idempotency key',
        format(
            'INSERT INTO pay54.idempotency_records
             (owner_subject, idempotency_key,
              request_digest, operation_id)
             VALUES (%L, %L, %L, %L)',
            v_owner,
            v_idempotency_key,
            repeat('b', 64),
            v_operation
        ),
        '23505'
    );

    RAISE NOTICE
        'PASS: Initial financial integrity fixture suite completed';
END;
$$;

-- ============================================================================
-- TEST 9: UNBALANCED JOURNAL
--
-- The deferred balance constraint must reject posting.
-- The exception block rolls back the attempted journal and entries.
-- ============================================================================

DO $$
DECLARE
    v_account UUID;
    v_journal UUID;
    v_rejected BOOLEAN := FALSE;
    v_message TEXT;
BEGIN
    SELECT id INTO v_account
    FROM pay54_test_ids
    WHERE name = 'asset_account';

    BEGIN
        INSERT INTO pay54.ledger_journals (journal_type)
        VALUES ('ADJUSTMENT')
        RETURNING id INTO v_journal;

        INSERT INTO pay54.ledger_entries (
            journal_id,
            account_id,
            currency,
            amount_minor
        )
        VALUES
            (v_journal, v_account, 'NGN', 100),
            (v_journal, v_account, 'NGN', -90);

        UPDATE pay54.ledger_journals
        SET status = 'POSTED',
            posted_at = now()
        WHERE id = v_journal;

        SET CONSTRAINTS ALL IMMEDIATE;

    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS
            v_message = MESSAGE_TEXT;

        IF v_message LIKE
            'Posted journal % is not balanced by currency'
        THEN
            v_rejected := TRUE;
        ELSE
            RAISE;
        END IF;
    END;

    IF NOT v_rejected THEN
        RAISE EXCEPTION
            'FAIL: Unbalanced journal was accepted';
    END IF;

    RAISE NOTICE
        'PASS: Unbalanced posted journal rejected';
END;
$$;

-- ============================================================================
-- TEST 10: SINGLE-ENTRY JOURNAL
-- ============================================================================

DO $$
DECLARE
    v_account UUID;
    v_journal UUID;
    v_rejected BOOLEAN := FALSE;
    v_message TEXT;
BEGIN
    SELECT id INTO v_account
    FROM pay54_test_ids
    WHERE name = 'asset_account';

    BEGIN
        INSERT INTO pay54.ledger_journals (journal_type)
        VALUES ('ADJUSTMENT')
        RETURNING id INTO v_journal;

        INSERT INTO pay54.ledger_entries (
            journal_id,
            account_id,
            currency,
            amount_minor
        )
        VALUES (
            v_journal,
            v_account,
            'NGN',
            100
        );

        UPDATE pay54.ledger_journals
        SET status = 'POSTED',
            posted_at = now()
        WHERE id = v_journal;

        SET CONSTRAINTS ALL IMMEDIATE;

    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS
            v_message = MESSAGE_TEXT;

        IF v_message LIKE
            'Posted journal % requires at least two entries'
        THEN
            v_rejected := TRUE;
        ELSE
            RAISE;
        END IF;
    END;

    IF NOT v_rejected THEN
        RAISE EXCEPTION
            'FAIL: Single-entry journal was accepted';
    END IF;

    RAISE NOTICE
        'PASS: Single-entry posted journal rejected';
END;
$$;

-- ============================================================================
-- TEST 11: REVERSAL CANNOT REFERENCE UNPOSTED JOURNAL
-- ============================================================================

DO $$
DECLARE
    v_draft UUID;
    v_reversal UUID;
    v_account_a UUID;
    v_account_b UUID;
    v_rejected BOOLEAN := FALSE;
    v_message TEXT;
BEGIN
    SELECT id INTO v_account_a
    FROM pay54_test_ids
    WHERE name = 'asset_account';

    SELECT id INTO v_account_b
    FROM pay54_test_ids
    WHERE name = 'liability_account';

    BEGIN
        INSERT INTO pay54.ledger_journals (
            journal_type
        )
        VALUES ('TRANSFER')
        RETURNING id INTO v_draft;

        INSERT INTO pay54.ledger_journals (
            journal_type,
            reverses_journal_id
        )
        VALUES (
            'REVERSAL',
            v_draft
        )
        RETURNING id INTO v_reversal;

        INSERT INTO pay54.ledger_entries (
            journal_id,
            account_id,
            currency,
            amount_minor
        )
        VALUES
            (v_reversal, v_account_a, 'NGN', 100),
            (v_reversal, v_account_b, 'NGN', -100);

        UPDATE pay54.ledger_journals
        SET status = 'POSTED',
            posted_at = now()
        WHERE id = v_reversal;

        SET CONSTRAINTS ALL IMMEDIATE;

    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS
            v_message = MESSAGE_TEXT;

        IF v_message =
            'Reversal must reference an already posted journal'
        THEN
            v_rejected := TRUE;
        ELSE
            RAISE;
        END IF;
    END;

    IF NOT v_rejected THEN
        RAISE EXCEPTION
            'FAIL: Reversal of draft journal was accepted';
    END IF;

    RAISE NOTICE
        'PASS: Reversal of unposted journal rejected';
END;
$$;

-- ============================================================================
-- TEST COMPLETION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE
        'PAY54 LEDGER TEST SUITE COMPLETED';

    RAISE NOTICE
        'All test fixtures will now be rolled back';

    RAISE NOTICE
        'No financial execution service has been enabled';
END;
$$;

ROLLBACK;
