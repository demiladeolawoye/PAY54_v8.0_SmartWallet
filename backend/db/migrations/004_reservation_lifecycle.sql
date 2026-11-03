
-- ============================================================================
-- PAY54 ENTERPRISE RESERVATION LIFECYCLE
-- File: backend/db/migrations/004_reservation_lifecycle.sql
-- Version: 1.0.0
-- Work Package: WP-P54-BACKEND-001F
--
-- PostgreSQL 16+
-- Requires migrations 001, 002 and 003.
--
-- Scope:
--   Internal PAY54 wallet-to-wallet transfers only.
--   No bank payout, FX, card, provider or real-money API integration.
--
-- Security:
--   Functions are SECURITY INVOKER.
--   They require the authenticated subject from a trusted service.
--   PUBLIC execution is revoked.
--   No runtime service role is granted access by this migration.
--
-- Do not apply to a database containing customer funds until all
-- migrations, concurrency tests and access controls are approved.
-- ============================================================================

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Exactly one internal transfer journal per operation.
-- This does not prevent distinct reversal journals, which use their
-- own uniquely constrained original-journal reference.

CREATE UNIQUE INDEX IF NOT EXISTS
    ledger_one_transfer_journal_per_operation
ON pay54.ledger_journals (operation_id)
WHERE journal_type = 'TRANSFER'
  AND operation_id IS NOT NULL;

-- ============================================================================
-- CAPTURE RESERVED INTERNAL TRANSFER
--
-- The function:
-- 1. Locks the authoritative financial operation.
-- 2. Verifies the caller's authenticated ownership.
-- 3. Checks the active reservation and both wallets.
-- 4. Refuses provider-backed transactions.
-- 5. Locks source and destination financial accounts.
-- 6. Creates one balanced double-entry transfer journal.
-- 7. Forces deferred ledger checks before completing capture.
-- 8. Marks the reservation CAPTURED and operation SETTLED.
-- 9. Writes an outbox event in the same database transaction.
--
-- A retry of an already captured operation returns ALREADY_CAPTURED.
--
-- This primitive must only be called by future authorised internal
-- financial services after trusted business-policy verification.
-- ============================================================================

CREATE FUNCTION pay54.capture_reserved_wallet_transfer(
    p_authenticated_owner UUID,
    p_operation_id UUID
)
RETURNS TABLE (
    operation_id UUID,
    outcome TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pay54
AS $$
DECLARE
    v_operation pay54.financial_operations%ROWTYPE;
    v_reservation pay54.balance_reservations%ROWTYPE;
    v_source_account pay54.ledger_accounts%ROWTYPE;

    v_destination_account UUID;
    v_source_wallet_status VARCHAR(20);
    v_destination_wallet_status VARCHAR(20);
    v_currency_active BOOLEAN;

    v_journal UUID;
    v_existing_journal UUID;
BEGIN
    IF p_authenticated_owner IS NULL
       OR p_operation_id IS NULL
    THEN
        RAISE EXCEPTION
            'Authenticated owner and operation are required'
            USING ERRCODE = 'P5410';
    END IF;

    SELECT *
      INTO v_operation
      FROM pay54.financial_operations AS op
     WHERE op.id = p_operation_id
     FOR UPDATE;

    IF NOT FOUND
       OR v_operation.owner_subject IS DISTINCT FROM
          p_authenticated_owner
    THEN
        RAISE EXCEPTION
            'Financial operation is not accessible'
            USING ERRCODE = 'P5411';
    END IF;

    IF v_operation.kind <> 'WALLET_TRANSFER' THEN
        RAISE EXCEPTION
            'Only internal wallet transfers can be captured'
            USING ERRCODE = 'P5412';
    END IF;

    SELECT *
      INTO v_reservation
      FROM pay54.balance_reservations
     WHERE operation_id = p_operation_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Operation reservation is missing'
            USING ERRCODE = 'P5413';
    END IF;

    -- Replay is successful only when the operation, reservation and
    -- original posted transfer journal are mutually consistent.

    IF v_operation.state = 'SETTLED'
       AND v_reservation.status = 'CAPTURED'
    THEN
        SELECT j.id
          INTO v_existing_journal
          FROM pay54.ledger_journals AS j
         WHERE j.operation_id = p_operation_id
           AND j.journal_type = 'TRANSFER'
           AND j.status = 'POSTED';

        IF v_existing_journal IS NULL THEN
            RAISE EXCEPTION
                'Settled operation lacks authoritative ledger posting'
                USING ERRCODE = 'P5414';
        END IF;

        RETURN QUERY
        SELECT p_operation_id, 'ALREADY_CAPTURED'::TEXT;
        RETURN;
    END IF;

    IF v_operation.state <> 'RESERVED'
       OR v_reservation.status <> 'HELD'
    THEN
        RAISE EXCEPTION
            'Operation is not eligible for capture'
            USING ERRCODE = 'P5415';
    END IF;

    -- A provider operation must never be settled via an internal
    -- wallet-transfer posting.

    IF EXISTS (
        SELECT 1
          FROM pay54.provider_attempts AS pa
         WHERE pa.operation_id = p_operation_id
    ) THEN
        RAISE EXCEPTION
            'Provider-backed operation requires separate settlement'
            USING ERRCODE = 'P5416';
    END IF;

    SELECT *
      INTO v_source_account
      FROM pay54.ledger_accounts AS a
     WHERE a.id = v_reservation.account_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Reservation source account is missing'
            USING ERRCODE = 'P5417';
    END IF;

    -- Validate reservation/operation/account consistency.

    IF v_source_account.wallet_id IS DISTINCT FROM
         v_operation.source_wallet_id
       OR v_source_account.currency <> v_operation.currency
       OR v_reservation.currency <> v_operation.currency
       OR v_reservation.amount_minor <> v_operation.amount_minor
       OR v_source_account.account_class <> 'CUSTOMER_LIABILITY'
    THEN
        RAISE EXCEPTION
            'Reservation financial identity mismatch'
            USING ERRCODE = 'P5418';
    END IF;

    SELECT w.status
      INTO v_source_wallet_status
      FROM pay54.wallets AS w
     WHERE w.id = v_operation.source_wallet_id
       AND w.owner_subject = p_authenticated_owner;

    SELECT w.status
      INTO v_destination_wallet_status
      FROM pay54.wallets AS w
     WHERE w.id = v_operation.destination_wallet_id;

    SELECT a.id
      INTO v_destination_account
      FROM pay54.ledger_accounts AS a
     WHERE a.wallet_id = v_operation.destination_wallet_id
       AND a.currency = v_operation.currency
       AND a.account_class = 'CUSTOMER_LIABILITY'
       AND a.status = 'OPEN';

    SELECT c.active
      INTO v_currency_active
      FROM pay54.currencies AS c
     WHERE c.code = v_operation.currency;

    IF v_source_wallet_status IS DISTINCT FROM 'ACTIVE'
       OR v_destination_wallet_status IS DISTINCT FROM 'ACTIVE'
       OR v_source_account.status <> 'OPEN'
       OR v_destination_account IS NULL
       OR v_currency_active IS DISTINCT FROM TRUE
       OR v_operation.source_wallet_id =
          v_operation.destination_wallet_id
    THEN
        RAISE EXCEPTION
            'Wallets or accounts are not eligible for settlement'
            USING ERRCODE = 'P5419';
    END IF;

    -- Lock both financial accounts in a deterministic UUID order.
    -- Future posting writers must follow the same discipline.
    -- This prevents two internal capture operations from locking
    -- opposing wallet accounts in conflicting orders.

    PERFORM a.id
      FROM pay54.ledger_accounts AS a
     WHERE a.id IN (
        v_source_account.id,
        v_destination_account
     )
     ORDER BY a.id
     FOR UPDATE;

    -- Recheck financial account eligibility after acquiring locks.

    IF (
        SELECT COUNT(*)
          FROM pay54.ledger_accounts AS a
         WHERE a.id IN (
            v_source_account.id,
            v_destination_account
         )
           AND a.status = 'OPEN'
    ) <> 2 THEN
        RAISE EXCEPTION
            'Financial account was closed or frozen'
            USING ERRCODE = 'P5419';
    END IF;

    -- The operation cannot have been posted previously.

    IF EXISTS (
        SELECT 1
          FROM pay54.ledger_journals AS j
         WHERE j.operation_id = p_operation_id
           AND j.journal_type = 'TRANSFER'
    ) THEN
        RAISE EXCEPTION
            'Operation already has a transfer journal'
            USING ERRCODE = 'P5414';
    END IF;

    -- Original transfer journal is linked to the operation.

    INSERT INTO pay54.ledger_journals (
        operation_id,
        journal_type
    )
    VALUES (
        p_operation_id,
        'TRANSFER'
    )
    RETURNING id INTO v_journal;

    -- Debit customer liability source; credit destination.
    -- Both entries share one currency and exact minor-unit amount.

    INSERT INTO pay54.ledger_entries (
        journal_id,
        account_id,
        currency,
        amount_minor
    )
    VALUES
        (
            v_journal,
            v_source_account.id,
            v_operation.currency,
            -v_operation.amount_minor
        ),
        (
            v_journal,
            v_destination_account,
            v_operation.currency,
            v_operation.amount_minor
        );

    -- Advance through SUBMITTED for compatibility with the
    -- existing domain lifecycle, without calling an external rail.

    UPDATE pay54.financial_operations
       SET state = 'SUBMITTED',
           updated_at = clock_timestamp()
     WHERE id = p_operation_id;

    UPDATE pay54.ledger_journals
       SET status = 'POSTED',
           posted_at = clock_timestamp()
     WHERE id = v_journal;

    -- Force the deferred financial journal integrity trigger
    -- to run before recording settlement completion.

    SET CONSTRAINTS ledger_posting_integrity IMMEDIATE;

    UPDATE pay54.balance_reservations
       SET status = 'CAPTURED'
     WHERE id = v_reservation.id
       AND status = 'HELD';

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Reservation capture state changed unexpectedly'
            USING ERRCODE = 'P5415';
    END IF;

    UPDATE pay54.financial_operations
       SET state = 'SETTLED',
           updated_at = clock_timestamp()
     WHERE id = p_operation_id
       AND state = 'SUBMITTED';

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Operation settlement state changed unexpectedly'
            USING ERRCODE = 'P5415';
    END IF;

    INSERT INTO pay54.outbox_events (
        event_type,
        aggregate_id,
        payload
    )
    VALUES (
        'financial.operation.settled.v1',
        p_operation_id,
        jsonb_build_object(
            'operationId', p_operation_id::TEXT,
            'journalId', v_journal::TEXT,
            'settlementType', 'INTERNAL_WALLET_TRANSFER'
        )
    );

    RETURN QUERY
    SELECT p_operation_id, 'CAPTURED'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION
pay54.capture_reserved_wallet_transfer(UUID, UUID)
FROM PUBLIC;

-- ============================================================================
-- RELEASE RESERVED INTERNAL TRANSFER
--
-- A hold can be released only while:
--   * its operation remains RESERVED
--   * the reservation remains HELD
--   * no provider attempt exists
--   * no financial posting has been created for the operation
--
-- This does not permit arbitrary release of SUBMITTED or
-- PROVIDER_UNKNOWN financial operations.
-- ============================================================================

CREATE FUNCTION pay54.release_reserved_wallet_transfer(
    p_authenticated_owner UUID,
    p_operation_id UUID,
    p_reason TEXT
)
RETURNS TABLE (
    operation_id UUID,
    outcome TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pay54
AS $$
DECLARE
    v_operation pay54.financial_operations%ROWTYPE;
    v_reservation pay54.balance_reservations%ROWTYPE;
BEGIN
    IF p_authenticated_owner IS NULL
       OR p_operation_id IS NULL
       OR p_reason IS NULL
       OR p_reason NOT IN (
           'CONFIRMED_FAILURE',
           'CUSTOMER_CANCELLED',
           'EXPIRED_UNSUBMITTED'
       )
    THEN
        RAISE EXCEPTION
            'Invalid reservation release instruction'
            USING ERRCODE = 'P5420';
    END IF;

    SELECT *
      INTO v_operation
      FROM pay54.financial_operations
     WHERE id = p_operation_id
     FOR UPDATE;

    IF NOT FOUND
       OR v_operation.owner_subject IS DISTINCT FROM
          p_authenticated_owner
    THEN
        RAISE EXCEPTION
            'Financial operation is not accessible'
            USING ERRCODE = 'P5411';
    END IF;

    IF v_operation.kind <> 'WALLET_TRANSFER' THEN
        RAISE EXCEPTION
            'Only internal wallet reservations can be released'
            USING ERRCODE = 'P5412';
    END IF;

    SELECT *
      INTO v_reservation
      FROM pay54.balance_reservations
     WHERE operation_id = p_operation_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Operation reservation is missing'
            USING ERRCODE = 'P5413';
    END IF;

    -- Safe retry after confirmed release.

    IF v_operation.state = 'FAILED'
       AND v_reservation.status = 'RELEASED'
    THEN
        RETURN QUERY
        SELECT p_operation_id, 'ALREADY_RELEASED'::TEXT;
        RETURN;
    END IF;

    IF v_operation.state <> 'RESERVED'
       OR v_reservation.status <> 'HELD'
    THEN
        RAISE EXCEPTION
            'Operation is not eligible for release'
            USING ERRCODE = 'P5421';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pay54.provider_attempts
        WHERE operation_id = p_operation_id
    ) OR EXISTS (
        SELECT 1
        FROM pay54.ledger_journals
        WHERE operation_id = p_operation_id
    ) THEN
        RAISE EXCEPTION
            'Release blocked: operation may already have executed'
            USING ERRCODE = 'P5422';
    END IF;

    IF p_reason = 'EXPIRED_UNSUBMITTED'
       AND v_reservation.expires_at > clock_timestamp()
    THEN
        RAISE EXCEPTION
            'Reservation has not expired'
            USING ERRCODE = 'P5423';
    END IF;

    -- Lock source account to coordinate with reservation availability.
    PERFORM a.id
      FROM pay54.ledger_accounts AS a
     WHERE a.id = v_reservation.account_id
     FOR UPDATE;

    UPDATE pay54.balance_reservations
       SET status = 'RELEASED'
     WHERE id = v_reservation.id
       AND status = 'HELD';

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Reservation release state changed unexpectedly'
            USING ERRCODE = 'P5421';
    END IF;

    UPDATE pay54.financial_operations
       SET state = 'FAILED',
           updated_at = clock_timestamp()
     WHERE id = p_operation_id
       AND state = 'RESERVED';

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Operation release state changed unexpectedly'
            USING ERRCODE = 'P5421';
    END IF;

    INSERT INTO pay54.outbox_events (
        event_type,
        aggregate_id,
        payload
    )
    VALUES (
        'financial.operation.reservation_released.v1',
        p_operation_id,
        jsonb_build_object(
            'operationId', p_operation_id::TEXT,
            'reason', p_reason
        )
    );

    RETURN QUERY
    SELECT p_operation_id, 'RELEASED'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION
pay54.release_reserved_wallet_transfer(UUID, UUID, TEXT)
FROM PUBLIC;

COMMIT;
