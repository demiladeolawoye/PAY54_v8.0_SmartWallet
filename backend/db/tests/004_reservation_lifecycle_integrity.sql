
-- ============================================================================
-- PAY54 RESERVATION LIFECYCLE INTEGRITY TESTS
-- File: backend/db/tests/004_reservation_lifecycle_integrity.sql
-- Version: 1.0.0
-- Work Package: WP-P54-BACKEND-001F
--
-- PostgreSQL 16+
-- Requires migrations 001, 002, 003 and 004.
-- Run only against an isolated, disposable CI database.
-- All synthetic financial fixtures are rolled back.
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';

DO $$
DECLARE
    v_owner UUID := gen_random_uuid();
    v_other_owner UUID := gen_random_uuid();

    v_source_wallet UUID;
    v_destination_wallet UUID;

    v_source_account UUID;
    v_destination_account UUID;
    v_clearing_account UUID;

    v_funding_journal UUID;
    v_transfer_journal UUID;

    v_capture_operation UUID;
    v_release_operation UUID;
    v_expiry_operation UUID;

    v_result_operation UUID;
    v_outcome TEXT;

    v_source_balance NUMERIC;
    v_destination_balance NUMERIC;
    v_held_amount NUMERIC;

    v_count BIGINT;
    v_rejected BOOLEAN;

    v_expiry TIMESTAMPTZ :=
        clock_timestamp() + INTERVAL '1 hour';
BEGIN
    UPDATE pay54.currencies
       SET active = TRUE
     WHERE code = 'NGN';

    -- ========================================================================
    -- FIXTURE: TWO ACTIVE WALLETS, FUNDED FROM SYNTHETIC CLEARING
    -- ========================================================================

    INSERT INTO pay54.wallets (
        owner_subject, market_code, status
    )
    VALUES (
        v_owner, 'NG', 'ACTIVE'
    )
    RETURNING id INTO v_source_wallet;

    INSERT INTO pay54.wallets (
        owner_subject, market_code, status
    )
    VALUES (
        v_other_owner, 'NG', 'ACTIVE'
    )
    RETURNING id INTO v_destination_wallet;

    INSERT INTO pay54.ledger_accounts (
        wallet_id, currency, account_class, account_reference
    )
    VALUES (
        v_source_wallet, 'NGN', 'CUSTOMER_LIABILITY',
        'test-004-source-' || gen_random_uuid()::TEXT
    )
    RETURNING id INTO v_source_account;

    INSERT INTO pay54.ledger_accounts (
        wallet_id, currency, account_class, account_reference
    )
    VALUES (
        v_destination_wallet, 'NGN', 'CUSTOMER_LIABILITY',
        'test-004-destination-' || gen_random_uuid()::TEXT
    )
    RETURNING id INTO v_destination_account;

    INSERT INTO pay54.ledger_accounts (
        currency, account_class, account_reference
    )
    VALUES (
        'NGN', 'PROVIDER_CLEARING',
        'test-004-clearing-' || gen_random_uuid()::TEXT
    )
    RETURNING id INTO v_clearing_account;

    INSERT INTO pay54.ledger_journals (
        journal_type
    )
    VALUES (
        'FUNDING'
    )
    RETURNING id INTO v_funding_journal;

    INSERT INTO pay54.ledger_entries (
        journal_id, account_id, currency, amount_minor
    )
    VALUES
        (
            v_funding_journal,
            v_source_account,
            'NGN',
            10000
        ),
        (
            v_funding_journal,
            v_clearing_account,
            'NGN',
            -10000
        );

    UPDATE pay54.ledger_journals
       SET status = 'POSTED',
           posted_at = clock_timestamp()
     WHERE id = v_funding_journal;

    SET CONSTRAINTS ALL IMMEDIATE;

    RAISE NOTICE 'PASS: Synthetic funded wallets created';

    -- ========================================================================
    -- TEST 1: RESERVE 6000 OF 10000 MINOR UNITS
    -- ========================================================================

    SELECT operation_id, outcome
      INTO v_capture_operation, v_outcome
      FROM pay54.reserve_wallet_transfer(
        v_owner,
        v_source_account,
        v_destination_wallet,
        6000,
        'pay54-lifecycle-capture-0001',
        repeat('a', 64),
        v_expiry
      );

    IF v_outcome <> 'CREATED'
       OR v_capture_operation IS NULL
    THEN
        RAISE EXCEPTION
            'FAIL: Initial reservation not created';
    END IF;

    -- ========================================================================
    -- TEST 2: OWNER AUTHORIZATION
    -- ========================================================================

    v_rejected := FALSE;

    BEGIN
        PERFORM *
          FROM pay54.capture_reserved_wallet_transfer(
            v_other_owner,
            v_capture_operation
          );

    EXCEPTION WHEN SQLSTATE 'P5411' THEN
        v_rejected := TRUE;
    END;

    IF NOT v_rejected THEN
        RAISE EXCEPTION
            'FAIL: Unauthorized capture was not rejected';
    END IF;

    RAISE NOTICE 'PASS: Unauthorized capture rejected';

    -- ========================================================================
    -- TEST 3: CAPTURE FUNDS EXACTLY ONCE
    -- ========================================================================

    SELECT operation_id, outcome
      INTO v_result_operation, v_outcome
      FROM pay54.capture_reserved_wallet_transfer(
        v_owner,
        v_capture_operation
      );

    IF v_result_operation <> v_capture_operation
       OR v_outcome <> 'CAPTURED'
    THEN
        RAISE EXCEPTION
            'FAIL: Reserved transfer was not captured';
    END IF;

    SELECT id
      INTO v_transfer_journal
      FROM pay54.ledger_journals
     WHERE operation_id = v_capture_operation
       AND journal_type = 'TRANSFER'
       AND status = 'POSTED';

    IF v_transfer_journal IS NULL THEN
        RAISE EXCEPTION
            'FAIL: Capture lacks posted transfer journal';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pay54.financial_operations
        WHERE id = v_capture_operation
          AND state = 'SETTLED'
    ) OR NOT EXISTS (
        SELECT 1
        FROM pay54.balance_reservations
        WHERE operation_id = v_capture_operation
          AND status = 'CAPTURED'
    ) THEN
        RAISE EXCEPTION
            'FAIL: Capture states not committed consistently';
    END IF;

    -- Verify the actual account-level postings.

    IF (
        SELECT COUNT(*)
        FROM pay54.ledger_entries
        WHERE journal_id = v_transfer_journal
    ) <> 2
    OR NOT EXISTS (
        SELECT 1
        FROM pay54.ledger_entries
        WHERE journal_id = v_transfer_journal
          AND account_id = v_source_account
          AND currency = 'NGN'
          AND amount_minor = -6000
    )
    OR NOT EXISTS (
        SELECT 1
        FROM pay54.ledger_entries
        WHERE journal_id = v_transfer_journal
          AND account_id = v_destination_account
          AND currency = 'NGN'
          AND amount_minor = 6000
    ) THEN
        RAISE EXCEPTION
            'FAIL: Transfer postings are incorrect';
    END IF;

    RAISE NOTICE
        'PASS: Capture produced exactly balanced transfer entries';

    -- ========================================================================
    -- TEST 4: CAPTURE RETRY DOES NOT POST AGAIN
    -- ========================================================================

    SELECT operation_id, outcome
      INTO v_result_operation, v_outcome
      FROM pay54.capture_reserved_wallet_transfer(
        v_owner,
        v_capture_operation
      );

    IF v_outcome <> 'ALREADY_CAPTURED'
       OR v_result_operation <> v_capture_operation
    THEN
        RAISE EXCEPTION
            'FAIL: Capture replay did not return original operation';
    END IF;

    SELECT COUNT(*)
      INTO v_count
      FROM pay54.ledger_journals
     WHERE operation_id = v_capture_operation
       AND journal_type = 'TRANSFER';

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            'FAIL: Duplicate transfer journal created';
    END IF;

    IF (
        SELECT COUNT(*)
        FROM pay54.outbox_events
        WHERE aggregate_id = v_capture_operation
          AND event_type =
              'financial.operation.settled.v1'
    ) <> 1 THEN
        RAISE EXCEPTION
            'FAIL: Duplicate or missing settlement event';
    END IF;

    RAISE NOTICE
        'PASS: Capture retry creates no duplicate posting';

    -- ========================================================================
    -- TEST 5: CAPTURED FUNDS CANNOT BE RELEASED
    -- ========================================================================

    v_rejected := FALSE;

    BEGIN
        PERFORM *
        FROM pay54.release_reserved_wallet_transfer(
            v_owner,
            v_capture_operation,
            'CUSTOMER_CANCELLED'
        );
    EXCEPTION WHEN SQLSTATE 'P5421' THEN
        v_rejected := TRUE;
    END;

    IF NOT v_rejected THEN
        RAISE EXCEPTION
            'FAIL: Captured funds were released';
    END IF;

    RAISE NOTICE
        'PASS: Captured reservation cannot be released';

    -- ========================================================================
    -- TEST 6: NEW RESERVATION REFLECTS POSTED DEBIT
    -- ========================================================================

    SELECT operation_id, outcome
      INTO v_release_operation, v_outcome
      FROM pay54.reserve_wallet_transfer(
        v_owner,
        v_source_account,
        v_destination_wallet,
        3000,
        'pay54-lifecycle-release-0002',
        repeat('b', 64),
        v_expiry
      );

    IF v_outcome <> 'CREATED' THEN
        RAISE EXCEPTION
            'FAIL: Remaining funds could not be reserved';
    END IF;

    -- Source posted balance should be 4000 and another 3000 HELD.

    SELECT posted_minor
      INTO v_source_balance
      FROM pay54.posted_account_balances
     WHERE account_id = v_source_account;

    SELECT posted_minor
      INTO v_destination_balance
      FROM pay54.posted_account_balances
     WHERE account_id = v_destination_account;

    SELECT COALESCE(SUM(amount_minor), 0)
      INTO v_held_amount
      FROM pay54.balance_reservations
     WHERE account_id = v_source_account
       AND status = 'HELD';

    IF v_source_balance <> 4000
       OR v_destination_balance <> 6000
       OR v_held_amount <> 3000
    THEN
        RAISE EXCEPTION
            'FAIL: Posted and reserved balances inconsistent';
    END IF;

    RAISE NOTICE
        'PASS: Posted balances and remaining held funds correct';

    -- ========================================================================
    -- TEST 7: UNEXPIRED HOLD CANNOT USE EXPIRY RELEASE REASON
    -- ========================================================================

    v_rejected := FALSE;

    BEGIN
        PERFORM *
        FROM pay54.release_reserved_wallet_transfer(
            v_owner,
            v_release_operation,
            'EXPIRED_UNSUBMITTED'
        );
    EXCEPTION WHEN SQLSTATE 'P5423' THEN
        v_rejected := TRUE;
    END;

    IF NOT v_rejected THEN
        RAISE EXCEPTION
            'FAIL: Unexpired hold was released as expired';
    END IF;

    RAISE NOTICE
        'PASS: Expiry release requires expired hold';

    -- ========================================================================
    -- TEST 8: EXPLICIT CANCELLATION RELEASE
    -- ========================================================================

    SELECT operation_id, outcome
      INTO v_result_operation, v_outcome
      FROM pay54.release_reserved_wallet_transfer(
        v_owner,
        v_release_operation,
        'CUSTOMER_CANCELLED'
      );

    IF v_outcome <> 'RELEASED'
       OR v_result_operation <> v_release_operation
    THEN
        RAISE EXCEPTION
            'FAIL: Cancellation release unsuccessful';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pay54.financial_operations
        WHERE id = v_release_operation
          AND state = 'FAILED'
    ) OR NOT EXISTS (
        SELECT 1
        FROM pay54.balance_reservations
        WHERE operation_id = v_release_operation
          AND status = 'RELEASED'
    ) THEN
        RAISE EXCEPTION
            'FAIL: Release state inconsistency';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pay54.ledger_journals
        WHERE operation_id = v_release_operation
    ) THEN
        RAISE EXCEPTION
            'FAIL: Released operation unexpectedly posted funds';
    END IF;

    RAISE NOTICE
        'PASS: Cancelled hold released without ledger posting';

    -- ========================================================================
    -- TEST 9: RELEASE REPLAY
    -- ========================================================================

    SELECT operation_id, outcome
      INTO v_result_operation, v_outcome
      FROM pay54.release_reserved_wallet_transfer(
        v_owner,
        v_release_operation,
        'CUSTOMER_CANCELLED'
      );

    IF v_outcome <> 'ALREADY_RELEASED'
       OR v_result_operation <> v_release_operation
    THEN
        RAISE EXCEPTION
            'FAIL: Release replay not idempotent';
    END IF;

    IF (
        SELECT COUNT(*)
        FROM pay54.outbox_events
        WHERE aggregate_id = v_release_operation
          AND event_type =
              'financial.operation.reservation_released.v1'
    ) <> 1 THEN
        RAISE EXCEPTION
            'FAIL: Duplicate release event created';
    END IF;

    RAISE NOTICE
        'PASS: Release replay creates no duplicate event';

    -- ========================================================================
    -- TEST 10: RELEASED OPERATION CANNOT BE CAPTURED
    -- ========================================================================

    v_rejected := FALSE;

    BEGIN
        PERFORM *
        FROM pay54.capture_reserved_wallet_transfer(
            v_owner,
            v_release_operation
        );
    EXCEPTION WHEN SQLSTATE 'P5415' THEN
        v_rejected := TRUE;
    END;

    IF NOT v_rejected THEN
        RAISE EXCEPTION
            'FAIL: Released operation was captured';
    END IF;

    RAISE NOTICE
        'PASS: Released operation cannot be captured';

    -- ========================================================================
    -- TEST 11: EXPIRED, UNSUBMITTED HOLD CAN BE EXPLICITLY RELEASED
    -- ========================================================================

    SELECT operation_id, outcome
      INTO v_expiry_operation, v_outcome
      FROM pay54.reserve_wallet_transfer(
        v_owner,
        v_source_account,
        v_destination_wallet,
        1000,
        'pay54-lifecycle-expiry-0003',
        repeat('c', 64),
        v_expiry
      );

    -- Synthetic passage of expiry time inside the disposable fixture.
    -- A production service must never directly alter expiry timestamps
    -- without its authorised lifecycle controls.

    
UPDATE pay54.balance_reservations
   SET created_at = clock_timestamp() - INTERVAL '3 minutes',
       expires_at = clock_timestamp() - INTERVAL '1 minute'
 WHERE operation_id = v_expiry_operation;


    SELECT operation_id, outcome
      INTO v_result_operation, v_outcome
      FROM pay54.release_reserved_wallet_transfer(
        v_owner,
        v_expiry_operation,
        'EXPIRED_UNSUBMITTED'
      );

    IF v_outcome <> 'RELEASED' THEN
        RAISE EXCEPTION
            'FAIL: Expired, unsubmitted hold not released';
    END IF;

    RAISE NOTICE
        'PASS: Expired, unsubmitted hold explicitly released';

    -- ========================================================================
    -- TEST 12: FINAL FINANCIAL INVARIANTS
    -- ========================================================================

    SELECT posted_minor
      INTO v_source_balance
      FROM pay54.posted_account_balances
     WHERE account_id = v_source_account;

    SELECT posted_minor
      INTO v_destination_balance
      FROM pay54.posted_account_balances
     WHERE account_id = v_destination_account;

    SELECT COALESCE(SUM(amount_minor), 0)
      INTO v_held_amount
      FROM pay54.balance_reservations
     WHERE account_id = v_source_account
       AND status = 'HELD';

    IF v_source_balance <> 4000
       OR v_destination_balance <> 6000
       OR v_held_amount <> 0
    THEN
        RAISE EXCEPTION
            'FAIL: Final transfer and reservation balance mismatch';
    END IF;

    IF (
        SELECT COUNT(*)
        FROM pay54.ledger_journals
        WHERE operation_id = v_capture_operation
          AND journal_type = 'TRANSFER'
          AND status = 'POSTED'
    ) <> 1 THEN
        RAISE EXCEPTION
            'FAIL: Final settlement journal count incorrect';
    END IF;

    RAISE NOTICE
        'PASS: Final financial invariants verified';

    RAISE NOTICE
        'PAY54 RESERVATION LIFECYCLE TEST SUITE PASSED';
END;
$$;

ROLLBACK;
