
-- PAY54 WP-P54-BACKEND-001E | PostgreSQL 16+
-- Additive reservation foundation; does not enable financial execution.
-- Apply after migrations 001 and 002, first in disposable CI databases.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE pay54.financial_operations
  ADD COLUMN source_wallet_id UUID REFERENCES pay54.wallets(id),
  ADD COLUMN destination_wallet_id UUID REFERENCES pay54.wallets(id);

-- One customer liability account per wallet and currency is necessary
-- for unambiguous spendable-balance calculations.
CREATE UNIQUE INDEX ledger_customer_wallet_currency_unique
  ON pay54.ledger_accounts(wallet_id, currency)
  WHERE account_class = 'CUSTOMER_LIABILITY';

CREATE OR REPLACE FUNCTION pay54.reserve_wallet_transfer(
    p_authenticated_owner UUID,
    p_source_account_id UUID,
    p_destination_wallet_id UUID,
    p_amount_minor BIGINT,
    p_idempotency_key TEXT,
    p_request_digest TEXT,
    p_expires_at TIMESTAMPTZ
)
RETURNS TABLE(operation_id UUID, outcome TEXT)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pay54
AS $$
DECLARE
    v_existing_id UUID;
    v_existing_digest TEXT;
    v_source_wallet UUID;
    v_source_owner UUID;
    v_source_currency VARCHAR(3);
    v_source_class VARCHAR(24);
    v_source_status VARCHAR(16);
    v_source_wallet_status VARCHAR(20);
    v_destination_status VARCHAR(20);
    v_currency_active BOOLEAN;
    v_posted NUMERIC;
    v_held NUMERIC;
    v_operation_id UUID;
BEGIN
    -- This is a trusted-service-only database primitive, not an API route.
    -- The caller must independently authenticate p_authenticated_owner and
    -- validate that the digest represents the complete request body.
    IF p_authenticated_owner IS NULL
       OR p_source_account_id IS NULL
       OR p_destination_wallet_id IS NULL
       OR p_amount_minor IS NULL OR p_amount_minor <= 0
       OR p_idempotency_key IS NULL
       OR p_idempotency_key !~ '^[A-Za-z0-9._:-]{16,128}$'
       OR p_request_digest IS NULL
       OR p_request_digest !~ '^[0-9a-f]{64}$'
       OR p_expires_at IS NULL
       OR p_expires_at <= clock_timestamp() + INTERVAL '1 minute'
       OR p_expires_at > clock_timestamp() + INTERVAL '24 hours'
    THEN
        RAISE EXCEPTION 'Invalid reservation instruction'
          USING ERRCODE = 'P5405';
    END IF;

    -- Only the same (owner, key) is serialised by this advisory lock.
    -- Hash collisions cause extra waiting, not incorrect processing.
    -- The UNIQUE(owner_subject, idempotency_key) database constraint
    -- remains the definitive uniqueness protection.
    PERFORM pg_advisory_xact_lock(
        hashtextextended(
            p_authenticated_owner::TEXT || ':' || p_idempotency_key,
            0
        )
    );

    SELECT i.operation_id, i.request_digest
      INTO v_existing_id, v_existing_digest
      FROM pay54.idempotency_records AS i
     WHERE i.owner_subject = p_authenticated_owner
       AND i.idempotency_key = p_idempotency_key
     FOR UPDATE;

    IF FOUND THEN
        IF v_existing_digest <> p_request_digest THEN
            RAISE EXCEPTION 'Idempotency key reused with different request'
              USING ERRCODE = 'P5402';
        END IF;
        RETURN QUERY SELECT v_existing_id, 'REPLAY'::TEXT;
        RETURN;
    END IF;

    -- A source account row lock serialises all reservations on this account.
    SELECT a.wallet_id, w.owner_subject, a.currency, a.account_class,
           a.status, w.status, c.active
      INTO v_source_wallet, v_source_owner, v_source_currency,
           v_source_class, v_source_status, v_source_wallet_status,
           v_currency_active
      FROM pay54.ledger_accounts AS a
      JOIN pay54.wallets AS w ON w.id = a.wallet_id
      JOIN pay54.currencies AS c ON c.code = a.currency
     WHERE a.id = p_source_account_id
     FOR UPDATE OF a;

    IF NOT FOUND OR v_source_owner <> p_authenticated_owner
       OR v_source_class <> 'CUSTOMER_LIABILITY'
       OR v_source_status <> 'OPEN'
       OR v_source_wallet_status <> 'ACTIVE'
    THEN
        RAISE EXCEPTION 'Source account not eligible for reservation'
          USING ERRCODE = 'P5403';
    END IF;

    IF NOT v_currency_active THEN
        RAISE EXCEPTION 'Currency not enabled'
          USING ERRCODE = 'P5404';
    END IF;

    SELECT w.status INTO v_destination_status
      FROM pay54.wallets AS w
     WHERE w.id = p_destination_wallet_id;

    IF NOT FOUND OR v_destination_status <> 'ACTIVE'
       OR p_destination_wallet_id = v_source_wallet
       OR NOT EXISTS (
            SELECT 1 FROM pay54.ledger_accounts AS a
             WHERE a.wallet_id = p_destination_wallet_id
               AND a.currency = v_source_currency
               AND a.account_class = 'CUSTOMER_LIABILITY'
               AND a.status = 'OPEN'
       )
    THEN
        RAISE EXCEPTION 'Destination wallet not eligible'
          USING ERRCODE = 'P5406';
    END IF;

    -- Positive balances on CUSTOMER_LIABILITY accounts represent
    -- customer funds according to migration 001's signed-delta convention.
    SELECT COALESCE(SUM(e.amount_minor::NUMERIC), 0)
      INTO v_posted
      FROM pay54.ledger_entries AS e
      JOIN pay54.ledger_journals AS j ON j.id = e.journal_id
     WHERE e.account_id = p_source_account_id
       AND j.status = 'POSTED';

    -- Include ALL HELD reservations, even if their expiry passed.
    -- Expiry must be explicitly released by a separate trusted process;
    -- time passing alone must not silently make funds spendable.
    SELECT COALESCE(SUM(r.amount_minor::NUMERIC), 0)
      INTO v_held
      FROM pay54.balance_reservations AS r
     WHERE r.account_id = p_source_account_id
       AND r.status = 'HELD';

    IF v_posted < 0 OR v_posted - v_held < p_amount_minor::NUMERIC THEN
        RAISE EXCEPTION 'Insufficient available funds'
          USING ERRCODE = 'P5401';
    END IF;

    -- These writes form one atomic transaction with the reservation.
    -- No provider call, ledger debit, fund transfer, or settlement occurs.
    INSERT INTO pay54.financial_operations (
        owner_subject, kind, state, currency, amount_minor,
        source_wallet_id, destination_wallet_id
    ) VALUES (
        p_authenticated_owner, 'WALLET_TRANSFER', 'VALIDATING',
        v_source_currency, p_amount_minor,
        v_source_wallet, p_destination_wallet_id
    ) RETURNING id INTO v_operation_id;

    INSERT INTO pay54.idempotency_records (
        owner_subject, idempotency_key, request_digest, operation_id
    ) VALUES (
        p_authenticated_owner, p_idempotency_key,
        p_request_digest, v_operation_id
    );

    INSERT INTO pay54.balance_reservations (
        operation_id, account_id, currency,
        amount_minor, status, expires_at
    ) VALUES (
        v_operation_id, p_source_account_id, v_source_currency,
        p_amount_minor, 'HELD', p_expires_at
    );

    UPDATE pay54.financial_operations
       SET state = 'RESERVED', updated_at = clock_timestamp()
     WHERE id = v_operation_id;

    INSERT INTO pay54.outbox_events (event_type, aggregate_id, payload)
    VALUES (
        'financial.operation.reserved.v1', v_operation_id,
        jsonb_build_object('operationId', v_operation_id::TEXT)
    );

    RETURN QUERY SELECT v_operation_id, 'CREATED'::TEXT;
END;
$$;

-- This is a privileged internal primitive. No public or application-role
-- EXECUTE grant is made. Runtime roles will be designed and tested later.
REVOKE ALL ON FUNCTION pay54.reserve_wallet_transfer(
    UUID, UUID, UUID, BIGINT, TEXT, TEXT, TIMESTAMPTZ
) FROM PUBLIC;

COMMIT;
