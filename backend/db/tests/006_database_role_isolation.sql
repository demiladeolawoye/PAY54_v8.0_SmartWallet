
-- ============================================================================
-- PAY54 DATABASE ROLE ISOLATION REGRESSION TESTS
-- File: backend/db/tests/006_database_role_isolation.sql
-- Version: 1.0.0
-- Work Package: WP-P54-BACKEND-001G.2
--
-- Requires migrations 001-006.
-- PostgreSQL 16+.
--
-- Execute only on a disposable test database, as its migration owner
-- or CI superuser. It uses SET ROLE to verify real permission denials.
-- No financial records or customer credentials are created.
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';

-- ============================================================================
-- ADMINISTRATIVE PRECHECK
-- ============================================================================

DO $$
DECLARE
    v_role RECORD;
BEGIN
    FOR v_role IN
        SELECT *
        FROM pg_roles
        WHERE rolname IN (
            'pay54_financial_app_role',
            'pay54_financial_audit_role'
        )
    LOOP
        IF v_role.rolcanlogin
           OR v_role.rolsuper
           OR v_role.rolcreatedb
           OR v_role.rolcreaterole
           OR v_role.rolreplication
           OR v_role.rolbypassrls
        THEN
            RAISE EXCEPTION
                'FAIL: Restricted role has elevated privileges';
        END IF;
    END LOOP;

    IF (
        SELECT COUNT(*)
        FROM pg_roles
        WHERE rolname IN (
            'pay54_financial_app_role',
            'pay54_financial_audit_role'
        )
    ) <> 2 THEN
        RAISE EXCEPTION
            'FAIL: Both PAY54 restricted roles are required';
    END IF;

    RAISE NOTICE
        'PASS: Both roles exist without elevated attributes';
END;
$$;

-- ============================================================================
-- TEST THE FINANCIAL APPLICATION ROLE
-- ============================================================================

SET ROLE pay54_financial_app_role;

DO $$
DECLARE
    v_enabled BOOLEAN;
    v_mode TEXT;
    v_statement TEXT;
    v_denied BOOLEAN;
    v_denied_count INTEGER := 0;
BEGIN
    SELECT s.execution_enabled, s.execution_mode
      INTO v_enabled, v_mode
      FROM pay54.financial_execution_status() AS s;

    IF v_enabled IS DISTINCT FROM FALSE
       OR v_mode <> 'DISABLED_PENDING_TRUSTED_EXECUTION'
    THEN
        RAISE EXCEPTION
            'FAIL: Restricted financial status is not fail-closed';
    END IF;

    RAISE NOTICE
        'PASS: Financial role can read disabled execution status';

    -- All the following statements MUST fail with insufficient_privilege.
    -- WHERE FALSE does not make a financial UPDATE authorised.
    -- PostgreSQL still checks the privilege required by the statement.

    FOR v_statement IN
        SELECT unnest(ARRAY[
            'SELECT id FROM pay54.wallets LIMIT 1',

            'SELECT id FROM pay54.financial_operations LIMIT 1',

            'SELECT id FROM pay54.ledger_entries LIMIT 1',

            'SELECT * FROM pay54.posted_account_balances LIMIT 1',

            'UPDATE pay54.financial_operations SET amount_minor = amount_minor WHERE FALSE',

            'UPDATE pay54.balance_reservations SET status = status WHERE FALSE',

            'INSERT INTO pay54.ledger_journals (journal_type) VALUES (''TRANSFER'')',

            'DELETE FROM pay54.ledger_entries WHERE FALSE',

            'TRUNCATE TABLE pay54.ledger_entries',

            'ALTER TABLE pay54.financial_operations DISABLE TRIGGER financial_operation_state_guard',

            'CREATE TABLE pay54.unauthorised_financial_table (id BIGINT)'
        ])
    LOOP
        v_denied := FALSE;

        BEGIN
            EXECUTE v_statement;

        EXCEPTION WHEN insufficient_privilege THEN
            v_denied := TRUE;
        END;

        IF NOT v_denied THEN
            RAISE EXCEPTION
                'FAIL: Financial role was allowed to execute: %',
                v_statement;
        END IF;

        v_denied_count := v_denied_count + 1;
    END LOOP;

    IF v_denied_count <> 11 THEN
        RAISE EXCEPTION
            'FAIL: Financial role denial coverage incomplete';
    END IF;

    IF has_function_privilege(
        current_user,
        'pay54.reserve_wallet_transfer(uuid,uuid,uuid,bigint,text,text,timestamp with time zone)',
        'EXECUTE'
    ) OR has_function_privilege(
        current_user,
        'pay54.capture_reserved_wallet_transfer(uuid,uuid)',
        'EXECUTE'
    ) OR has_function_privilege(
        current_user,
        'pay54.release_reserved_wallet_transfer(uuid,uuid,text)',
        'EXECUTE'
    ) THEN
        RAISE EXCEPTION
            'FAIL: Financial role can call restricted money functions';
    END IF;

    RAISE NOTICE
        'PASS: Financial app role denied 11 prohibited SQL statements';

    RAISE NOTICE
        'PASS: Money movement functions unavailable to app role';
END;
$$;

RESET ROLE;

-- ============================================================================
-- TEST THE READ-ONLY AUDIT ROLE
-- ============================================================================

SET ROLE pay54_financial_audit_role;

DO $$
DECLARE
    v_currency_count BIGINT;
    v_statement TEXT;
    v_denied BOOLEAN;
    v_denied_count INTEGER := 0;
BEGIN
    SELECT COUNT(*)
      INTO v_currency_count
      FROM pay54.currencies;

    IF v_currency_count < 1 THEN
        RAISE EXCEPTION
            'FAIL: Currency catalogue is unexpectedly empty';
    END IF;

    RAISE NOTICE
        'PASS: Audit role can read currency catalogue';

    FOR v_statement IN
        SELECT unnest(ARRAY[
            'SELECT id FROM pay54.wallets LIMIT 1',

            'SELECT id FROM pay54.financial_operations LIMIT 1',

            'SELECT id FROM pay54.balance_reservations LIMIT 1',

            'SELECT id FROM pay54.ledger_journals LIMIT 1',

            'SELECT id FROM pay54.ledger_entries LIMIT 1',

            'SELECT id FROM pay54.idempotency_records LIMIT 1',

            'SELECT id FROM pay54.outbox_events LIMIT 1',

            'SELECT * FROM pay54.posted_account_balances LIMIT 1',

            'UPDATE pay54.currencies SET active = active WHERE FALSE',

            'DELETE FROM pay54.currencies WHERE FALSE'
        ])
    LOOP
        v_denied := FALSE;

        BEGIN
            EXECUTE v_statement;

        EXCEPTION WHEN insufficient_privilege THEN
            v_denied := TRUE;
        END;

        IF NOT v_denied THEN
            RAISE EXCEPTION
                'FAIL: Audit role was allowed to execute: %',
                v_statement;
        END IF;

        v_denied_count := v_denied_count + 1;
    END LOOP;

    IF v_denied_count <> 10 THEN
        RAISE EXCEPTION
            'FAIL: Audit role denial coverage incomplete';
    END IF;

    IF has_function_privilege(
        current_user,
        'pay54.financial_execution_status()',
        'EXECUTE'
    ) OR has_function_privilege(
        current_user,
        'pay54.capture_reserved_wallet_transfer(uuid,uuid)',
        'EXECUTE'
    ) THEN
        RAISE EXCEPTION
            'FAIL: Audit role has unauthorised function execution';
    END IF;

    RAISE NOTICE
        'PASS: Audit role denied 10 prohibited SQL statements';

    RAISE NOTICE
        'PASS: Audit role cannot execute financial functions';
END;
$$;

RESET ROLE;

-- ============================================================================
-- OBJECT-OWNERSHIP AND PRIVILEGE AUDIT
-- ============================================================================

DO $$
DECLARE
    v_role_name TEXT;
    v_role_id OID;
BEGIN
    FOREACH v_role_name IN ARRAY ARRAY[
        'pay54_financial_app_role',
        'pay54_financial_audit_role'
    ]
    LOOP
        SELECT oid
          INTO v_role_id
          FROM pg_roles
         WHERE rolname = v_role_name;

        IF EXISTS (
            SELECT 1
            FROM pg_class AS c
            JOIN pg_namespace AS n
              ON n.oid = c.relnamespace
            WHERE n.nspname = 'pay54'
              AND c.relowner = v_role_id
        ) OR EXISTS (
            SELECT 1
            FROM pg_proc AS p
            JOIN pg_namespace AS n
              ON n.oid = p.pronamespace
            WHERE n.nspname = 'pay54'
              AND p.proowner = v_role_id
        ) OR EXISTS (
            SELECT 1
            FROM pg_auth_members
            WHERE roleid = v_role_id
        ) THEN
            RAISE EXCEPTION
                'FAIL: Restricted role % has ownership or membership',
                v_role_name;
        END IF;
    END LOOP;

    RAISE NOTICE
        'PASS: Restricted roles have no financial object ownership';

    RAISE NOTICE
        'PAY54 DATABASE ROLE ISOLATION TESTS PASSED';

    RAISE NOTICE
        'Financial HTTP execution remains disabled';
END;
$$;

ROLLBACK;
