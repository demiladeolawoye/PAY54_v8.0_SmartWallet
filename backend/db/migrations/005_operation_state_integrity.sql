
-- ============================================================================
-- PAY54 ENTERPRISE: OPERATION STATE INTEGRITY
-- File: backend/db/migrations/005_operation_state_integrity.sql
-- Version: 1.0.0
-- Work Package: WP-P54-BACKEND-001G.1
--
-- PostgreSQL 16+
-- Requires migrations 001, 002, 003 and 004.
--
-- Enforces:
--  * An explicit financial-operation transition graph.
--  * Immutable operation ownership and financial identity.
--  * Reservation consistency for internal transfer lifecycle.
--  * Ledger evidence before an internal transfer becomes SETTLED.
--
-- Does not:
--  * Authenticate database callers.
--  * Authorise public payment endpoints.
--  * Secure every possible direct ledger-writing path.
--  * Enable bank payouts, FX or real-money operations.
--
-- Test only in an isolated PostgreSQL database initially.
-- ============================================================================

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
BEGIN
    IF to_regclass('pay54.financial_operations') IS NULL
       OR to_regclass('pay54.balance_reservations') IS NULL
       OR to_regclass('pay54.ledger_journals') IS NULL
    THEN
        RAISE EXCEPTION
            'PAY54 migrations 001-004 must be installed first';
    END IF;

    IF to_regprocedure(
        'pay54.capture_reserved_wallet_transfer(uuid,uuid)'
    ) IS NULL
       OR to_regprocedure(
        'pay54.release_reserved_wallet_transfer(uuid,uuid,text)'
    ) IS NULL
    THEN
        RAISE EXCEPTION
            'PAY54 reservation lifecycle functions are missing';
    END IF;
END;
$$;

-- ============================================================================
-- OPERATION INSERT AND UPDATE POLICY
--
-- Financial identity fields are immutable after the initial insert.
--
-- State transition evidence is checked at the database boundary for
-- internal wallet operations. A trusted service will additionally
-- verify customer authority and all necessary business evidence.
-- ============================================================================

CREATE FUNCTION pay54.guard_financial_operation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pay54
AS $$
DECLARE
    v_transition_allowed BOOLEAN := FALSE;
    v_reservation_status VARCHAR(16);
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION
            'Financial operations cannot be deleted'
            USING ERRCODE = 'P5431';
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF NEW.state NOT IN ('RECEIVED', 'VALIDATING') THEN
            RAISE EXCEPTION
                'Financial operation has invalid initial state'
                USING ERRCODE = 'P5430';
        END IF;

        RETURN NEW;
    END IF;

    -- Immutable identity and financial instruction attributes.
    -- created_at and correlation_id are also immutable.

    IF ROW(
        OLD.owner_subject,
        OLD.kind,
        OLD.currency,
        OLD.amount_minor,
        OLD.source_wallet_id,
        OLD.destination_wallet_id,
        OLD.correlation_id,
        OLD.created_at
    ) IS DISTINCT FROM ROW(
        NEW.owner_subject,
        NEW.kind,
        NEW.currency,
        NEW.amount_minor,
        NEW.source_wallet_id,
        NEW.destination_wallet_id,
        NEW.correlation_id,
        NEW.created_at
    ) THEN
        RAISE EXCEPTION
            'Financial operation identity and amount are immutable'
            USING ERRCODE = 'P5432';
    END IF;

    IF NEW.updated_at < OLD.updated_at THEN
        RAISE EXCEPTION
            'Financial operation update timestamp cannot move backward'
            USING ERRCODE = 'P5433';
    END IF;

    IF NEW.state IS NOT DISTINCT FROM OLD.state THEN
        RETURN NEW;
    END IF;

    -- Match the canonical operation transitions defined by
    -- backend/src/domain/financial-operation-state.mjs.

    v_transition_allowed := CASE OLD.state
        WHEN 'RECEIVED' THEN
            NEW.state = 'VALIDATING'

        WHEN 'VALIDATING' THEN
            NEW.state IN ('REJECTED', 'RESERVED')

        WHEN 'RESERVED' THEN
            NEW.state IN ('SUBMITTED', 'FAILED')

        WHEN 'SUBMITTED' THEN
            NEW.state IN (
                'PROVIDER_UNKNOWN',
                'SETTLED',
                'FAILED'
            )

        WHEN 'PROVIDER_UNKNOWN' THEN
            NEW.state IN ('SETTLED', 'FAILED')

        WHEN 'SETTLED' THEN
            NEW.state = 'REVERSAL_PENDING'

        WHEN 'REVERSAL_PENDING' THEN
            NEW.state = 'REVERSED'

        ELSE FALSE
    END;

    IF NOT v_transition_allowed THEN
        RAISE EXCEPTION
            'Forbidden financial operation transition: % to %',
            OLD.state, NEW.state
            USING ERRCODE = 'P5430';
    END IF;

    -- The new validation below is deliberately limited to internal
    -- wallet transfers. Provider-backed operations require separately
    -- verified execution and settlement controls.

    IF NEW.kind = 'WALLET_TRANSFER' THEN

        IF NEW.state IN ('RESERVED', 'SUBMITTED', 'SETTLED') THEN
            SELECT r.status
              INTO v_reservation_status
              FROM pay54.balance_reservations AS r
             WHERE r.operation_id = NEW.id;

            IF NOT FOUND THEN
                RAISE EXCEPTION
                    'Wallet operation requires a reservation'
                    USING ERRCODE = 'P5434';
            END IF;

            IF NEW.state IN ('RESERVED', 'SUBMITTED')
               AND v_reservation_status <> 'HELD'
            THEN
                RAISE EXCEPTION
                    'Reserved or submitted operation requires held funds'
                    USING ERRCODE = 'P5434';
            END IF;

            IF NEW.state = 'SETTLED' THEN
                IF v_reservation_status <> 'CAPTURED' THEN
                    RAISE EXCEPTION
                        'Settlement requires a captured reservation'
                        USING ERRCODE = 'P5435';
                END IF;

                IF NOT EXISTS (
                    SELECT 1
                    FROM pay54.ledger_journals AS j
                    WHERE j.operation_id = NEW.id
                      AND j.journal_type = 'TRANSFER'
                      AND j.status = 'POSTED'
                ) THEN
                    RAISE EXCEPTION
                        'Settlement requires a posted transfer journal'
                        USING ERRCODE = 'P5435';
                END IF;
            END IF;
        END IF;

        -- Current internal-wallet release procedure moves RESERVED
        -- directly to FAILED after releasing a HELD reservation.

        IF OLD.state = 'RESERVED'
           AND NEW.state = 'FAILED'
           AND NOT EXISTS (
               SELECT 1
               FROM pay54.balance_reservations AS r
               WHERE r.operation_id = NEW.id
                 AND r.status = 'RELEASED'
           )
        THEN
            RAISE EXCEPTION
                'Failed reserved transfer requires released funds'
                USING ERRCODE = 'P5436';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER financial_operation_state_guard
BEFORE INSERT OR UPDATE OR DELETE
ON pay54.financial_operations
FOR EACH ROW
EXECUTE FUNCTION pay54.guard_financial_operation();

-- ============================================================================
-- LEAST-PRIVILEGE BASELINE
--
-- Runtime application roles must never use schema-owner credentials.
-- Dedicated roles are deliberately not granted by this migration.
-- ============================================================================

REVOKE ALL ON SCHEMA pay54 FROM PUBLIC;

REVOKE ALL ON ALL TABLES
IN SCHEMA pay54 FROM PUBLIC;

REVOKE ALL ON ALL SEQUENCES
IN SCHEMA pay54 FROM PUBLIC;

REVOKE EXECUTE ON ALL FUNCTIONS
IN SCHEMA pay54 FROM PUBLIC;

ALTER DEFAULT PRIVILEGES IN SCHEMA pay54
REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Ensure the operation state trigger was successfully installed.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger AS t
        JOIN pg_class AS c ON c.oid = t.tgrelid
        JOIN pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname = 'pay54'
          AND c.relname = 'financial_operations'
          AND t.tgname = 'financial_operation_state_guard'
          AND t.tgenabled = 'O'
          AND NOT t.tgisinternal
    ) THEN
        RAISE EXCEPTION
            'PAY54 financial operation guard not installed';
    END IF;
END;
$$;

COMMIT;
