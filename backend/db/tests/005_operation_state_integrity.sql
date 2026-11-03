
-- ============================================================================
-- PAY54 FINANCIAL OPERATION STATE INTEGRITY TESTS
-- File: backend/db/tests/005_operation_state_integrity.sql
-- Version: 1.0.0
-- Work Package: WP-P54-BACKEND-001G.1
--
-- Requires migrations 001 through 005.
-- Execute only against a disposable PostgreSQL test database.
-- All fixture records are rolled back.
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
DECLARE
    v_owner UUID := gen_random_uuid();
    v_operation UUID;
    v_original_amount BIGINT;
    v_state TEXT;
    v_rejected BOOLEAN;
BEGIN
    -- ================================================================
    -- TEST 1: INITIAL FINANCIAL OPERATION
    -- ================================================================

    INSERT INTO pay54.financial_operations (
        owner_subject,
        kind,
        state,
        currency,
        amount_minor
    )
    VALUES (
        v_owner,
        'WALLET_TRANSFER',
        'RECEIVED',
        'NGN',
        2500
    )
    RETURNING id INTO v_operation;

    IF v_operation IS NULL THEN
        RAISE EXCEPTION
            'FAIL: Cannot create initial financial operation';
    END IF;

    RAISE NOTICE
        'PASS: Valid initial operation accepted';

    -- ================================================================
    -- TEST 2: VALID TRANSITION
    -- ================================================================

    UPDATE pay54.financial_operations
       SET state = 'VALIDATING',
           updated_at = clock_timestamp()
     WHERE id = v_operation;

    SELECT state INTO v_state
      FROM pay54.financial_operations
     WHERE id = v_operation;

    IF v_state <> 'VALIDATING' THEN
        RAISE EXCEPTION
            'FAIL: Valid state transition was not preserved';
    END IF;

    RAISE NOTICE
        'PASS: RECEIVED to VALIDATING accepted';

    -- ================================================================
    -- TEST 3: FORBIDDEN TRANSITION
    -- ================================================================

    v_rejected := FALSE;

    BEGIN
        UPDATE pay54.financial_operations
           SET state = 'SETTLED'
         WHERE id = v_operation;
    EXCEPTION WHEN SQLSTATE 'P5430' THEN
        v_rejected := TRUE;
    END;

    IF NOT v_rejected THEN
        RAISE EXCEPTION
            'FAIL: Direct transition to SETTLED was accepted';
    END IF;

    RAISE NOTICE
        'PASS: Illegal transition rejected';

    -- ================================================================
    -- TEST 4: AMOUNT IMMUTABILITY
    -- ================================================================

    SELECT amount_minor
      INTO v_original_amount
      FROM pay54.financial_operations
     WHERE id = v_operation;

    v_rejected := FALSE;

    BEGIN
        UPDATE pay54.financial_operations
           SET amount_minor = 999999
         WHERE id = v_operation;
    EXCEPTION WHEN SQLSTATE 'P5432' THEN
        v_rejected := TRUE;
    END;

    IF NOT v_rejected THEN
        RAISE EXCEPTION
            'FAIL: Operation amount was modified';
    END IF;

    IF (
        SELECT amount_minor
        FROM pay54.financial_operations
        WHERE id = v_operation
    ) <> v_original_amount THEN
        RAISE EXCEPTION
            'FAIL: Rejected amount modification was persisted';
    END IF;

    RAISE NOTICE
        'PASS: Operation amount immutable';

    -- ================================================================
    -- TEST 5: CURRENCY IMMUTABILITY
    -- ================================================================

    v_rejected := FALSE;

    BEGIN
        UPDATE pay54.financial_operations
           SET currency = 'GBP'
         WHERE id = v_operation;
    EXCEPTION WHEN SQLSTATE 'P5432' THEN
        v_rejected := TRUE;
    END;

    IF NOT v_rejected THEN
        RAISE EXCEPTION
            'FAIL: Operation currency was modified';
    END IF;

    RAISE NOTICE
        'PASS: Operation currency immutable';

    -- ================================================================
    -- TEST 6: OWNER IMMUTABILITY
    -- ================================================================

    v_rejected := FALSE;

    BEGIN
        UPDATE pay54.financial_operations
           SET owner_subject = gen_random_uuid()
         WHERE id = v_operation;
    EXCEPTION WHEN SQLSTATE 'P5432' THEN
        v_rejected := TRUE;
    END;

    IF NOT v_rejected THEN
        RAISE EXCEPTION
            'FAIL: Operation owner was modified';
    END IF;

    RAISE NOTICE
        'PASS: Operation owner immutable';

    -- ================================================================
    -- TEST 7: CANNOT RESERVE WITHOUT ACTUAL HELD FUNDS
    -- ================================================================

    v_rejected := FALSE;

    BEGIN
        UPDATE pay54.financial_operations
           SET state = 'RESERVED',
               updated_at = clock_timestamp()
         WHERE id = v_operation;
    EXCEPTION WHEN SQLSTATE 'P5434' THEN
        v_rejected := TRUE;
    END;

    IF NOT v_rejected THEN
        RAISE EXCEPTION
            'FAIL: Operation reserved without a hold';
    END IF;

    RAISE NOTICE
        'PASS: Fake reservation state rejected';

    -- ================================================================
    -- TEST 8: OPERATION DELETE IS FORBIDDEN
    -- ================================================================

    v_rejected := FALSE;

    BEGIN
        DELETE FROM pay54.financial_operations
        WHERE id = v_operation;
    EXCEPTION WHEN SQLSTATE 'P5431' THEN
        v_rejected := TRUE;
    END;

    IF NOT v_rejected THEN
        RAISE EXCEPTION
            'FAIL: Financial operation deletion accepted';
    END IF;

    RAISE NOTICE
        'PASS: Financial operation deletion rejected';

    -- ================================================================
    -- TEST 9: INITIAL SETTLED STATE IS FORBIDDEN
    -- ================================================================

    v_rejected := FALSE;

    BEGIN
        INSERT INTO pay54.financial_operations (
            owner_subject,
            kind,
            state,
            currency,
            amount_minor
        )
        VALUES (
            v_owner,
            'WALLET_TRANSFER',
            'SETTLED',
            'NGN',
            100
        );
    EXCEPTION WHEN SQLSTATE 'P5430' THEN
        v_rejected := TRUE;
    END;

    IF NOT v_rejected THEN
        RAISE EXCEPTION
            'FAIL: Initially settled operation accepted';
    END IF;

    RAISE NOTICE
        'PASS: Initially settled operation rejected';

    -- ================================================================
    -- TEST 10: ALLOWED REJECTION PATH
    -- ================================================================

    UPDATE pay54.financial_operations
       SET state = 'REJECTED',
           updated_at = clock_timestamp()
     WHERE id = v_operation;

    IF NOT EXISTS (
        SELECT 1
        FROM pay54.financial_operations
        WHERE id = v_operation
          AND state = 'REJECTED'
    ) THEN
        RAISE EXCEPTION
            'FAIL: Legal validation rejection not accepted';
    END IF;

    RAISE NOTICE
        'PASS: VALIDATING to REJECTED accepted';

    -- ================================================================
    -- TEST 11: TERMINAL STATE CANNOT REOPEN
    -- ================================================================

    v_rejected := FALSE;

    BEGIN
        UPDATE pay54.financial_operations
           SET state = 'VALIDATING'
         WHERE id = v_operation;
    EXCEPTION WHEN SQLSTATE 'P5430' THEN
        v_rejected := TRUE;
    END;

    IF NOT v_rejected THEN
        RAISE EXCEPTION
            'FAIL: Terminal operation reopened';
    END IF;

    RAISE NOTICE
        'PASS: Terminal state cannot be reopened';

    RAISE NOTICE
        'PAY54 OPERATION STATE INTEGRITY TESTS PASSED';
END;
$$;

-- ============================================================================
-- DATABASE PRIVILEGE BASELINE AUDIT
-- ============================================================================

DO $$
DECLARE
    v_public_schema_privileges BIGINT;
    v_public_table_privileges BIGINT;
    v_public_function_privileges BIGINT;
BEGIN
    SELECT COUNT(*)
      INTO v_public_schema_privileges
      FROM pg_namespace AS n
      CROSS JOIN LATERAL aclexplode(
          COALESCE(
              n.nspacl,
              acldefault('n', n.nspowner)
          )
      ) AS a
     WHERE n.nspname = 'pay54'
       AND a.grantee = 0;

    SELECT COUNT(*)
      INTO v_public_table_privileges
      FROM pg_class AS c
      JOIN pg_namespace AS n
        ON n.oid = c.relnamespace
      CROSS JOIN LATERAL aclexplode(
          COALESCE(
              c.relacl,
              acldefault(
                  CASE
                      WHEN c.relkind = 'S' THEN 'S'::"char"
                      ELSE 'r'::"char"
                  END,
                  c.relowner
              )
          )
      ) AS a
     WHERE n.nspname = 'pay54'
       AND c.relkind IN ('r', 'p', 'v', 'm', 'S')
       AND a.grantee = 0;

    SELECT COUNT(*)
      INTO v_public_function_privileges
      FROM pg_proc AS p
      JOIN pg_namespace AS n
        ON n.oid = p.pronamespace
      CROSS JOIN LATERAL aclexplode(
          COALESCE(
              p.proacl,
              acldefault('f', p.proowner)
          )
      ) AS a
     WHERE n.nspname = 'pay54'
       AND a.grantee = 0
       AND a.privilege_type = 'EXECUTE';

    IF v_public_schema_privileges <> 0
       OR v_public_table_privileges <> 0
       OR v_public_function_privileges <> 0
    THEN
        RAISE EXCEPTION
            'FAIL: PUBLIC database privileges remain';
    END IF;

    RAISE NOTICE
        'PASS: No implicit PUBLIC privileges on PAY54 schema, tables or functions';
END;
$$;

ROLLBACK;
