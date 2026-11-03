
-- ============================================================================
-- PAY54 DIRECT LEDGER ACCESS BOUNDARY TESTS
-- File: backend/db/tests/007_direct_ledger_access_boundary.sql
-- Version: 1.0.1
-- Work Package: WP-P54-BACKEND-001G.4
--
-- Requires migrations 001-007.
-- PostgreSQL 16+.
-- Disposable CI database only.
--
-- Test philosophy:
--   All three restricted roles must be denied direct financial SQL.
--   Existing safe status and currency catalogue grants must survive.
--   No financial records are created by these tests.
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';

-- A temporary, SECURITY INVOKER testing helper.
-- It runs under the privileges of the active SET ROLE identity.

CREATE FUNCTION pg_temp.assert_financial_sql_denied()
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_statement TEXT;
    v_denied BOOLEAN;
    v_count INTEGER := 0;
BEGIN
    FOR v_statement IN
        SELECT unnest(ARRAY[
            'SELECT id FROM pay54.financial_operations LIMIT 1',
            'SELECT id FROM pay54.ledger_entries LIMIT 1',
            'SELECT id FROM pay54.balance_reservations LIMIT 1',
            'SELECT id FROM pay54.outbox_events LIMIT 1',
            'INSERT INTO pay54.ledger_journals (journal_type) VALUES (''TRANSFER'')',
            'INSERT INTO pay54.ledger_entries (journal_id, account_id, currency, amount_minor) VALUES (gen_random_uuid(), gen_random_uuid(), ''NGN'', 100)',
            'UPDATE pay54.ledger_entries SET amount_minor = 99 WHERE FALSE',
            'DELETE FROM pay54.ledger_entries WHERE FALSE',
            'TRUNCATE pay54.ledger_entries',
            'UPDATE pay54.balance_reservations SET status = ''CAPTURED'' WHERE FALSE',
            'UPDATE pay54.financial_operations SET state = ''SETTLED'' WHERE FALSE',
            'DELETE FROM pay54.outbox_events WHERE FALSE',
            'ALTER TABLE pay54.ledger_entries DISABLE TRIGGER ledger_entry_immutable',
            'CREATE TABLE pay54.unauthorised_journal (id INTEGER)',
            'SELECT * FROM pay54.capture_reserved_wallet_transfer(gen_random_uuid(), gen_random_uuid())',
            'SELECT * FROM pay54.release_reserved_wallet_transfer(gen_random_uuid(), gen_random_uuid(), ''CUSTOMER_CANCELLED'')'
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
                'FAIL: % was permitted to execute %',
                current_user, v_statement;
        END IF;

        v_count := v_count + 1;
    END LOOP;

    IF v_count <> 16 THEN
        RAISE EXCEPTION
            'FAIL: Only % of 16 checks executed',
            v_count;
    END IF;

    RAISE NOTICE
        'PASS: % denied all % prohibited actions',
        current_user, v_count;
END;
$$;

-- Ensure none of the restricted roles owns financial schema objects.

DO $$
DECLARE
    v_name TEXT;
    v_role RECORD;
BEGIN
    FOREACH v_name IN ARRAY ARRAY[
        'pay54_financial_app_role',
        'pay54_financial_audit_role',
        'pay54_ledger_executor_role'
    ]
    LOOP
        SELECT * INTO v_role
        FROM pg_roles
        WHERE rolname = v_name;

        IF NOT FOUND
           OR v_role.rolcanlogin
           OR v_role.rolsuper
           OR v_role.rolcreatedb
           OR v_role.rolcreaterole
           OR v_role.rolreplication
           OR v_role.rolbypassrls
           OR v_role.rolinherit
        THEN
            RAISE EXCEPTION
                'FAIL: Unsafe role attributes: %', v_name;
        END IF;

        IF EXISTS (
            SELECT 1
            FROM pg_auth_members
            WHERE roleid = v_role.oid OR member = v_role.oid
        ) OR EXISTS (
            SELECT 1
            FROM pg_class AS c
            JOIN pg_namespace AS n
              ON n.oid = c.relnamespace
            WHERE n.nspname = 'pay54'
              AND c.relowner = v_role.oid
        ) OR EXISTS (
            SELECT 1
            FROM pg_proc AS p
            JOIN pg_namespace AS n
              ON n.oid = p.pronamespace
            WHERE n.nspname = 'pay54'
              AND p.proowner = v_role.oid
        ) THEN
            RAISE EXCEPTION
                'FAIL: Restricted role % has ownership or membership',
                v_name;
        END IF;
    END LOOP;

    RAISE NOTICE
        'PASS: Restricted identities have no financial ownership';
END;
$$;

-- Application role: prohibited financial actions, permitted safe status.

SET ROLE pay54_financial_app_role;

SELECT pg_temp.assert_financial_sql_denied();

DO $$
DECLARE
    v_enabled BOOLEAN;
BEGIN
    SELECT execution_enabled INTO v_enabled
    FROM pay54.financial_execution_status();

    IF v_enabled IS DISTINCT FROM FALSE THEN
        RAISE EXCEPTION
            'FAIL: Application execution status is enabled';
    END IF;

    RAISE NOTICE
        'PASS: Application execution remains disabled';
END;
$$;

RESET ROLE;

-- Audit role: prohibited financial actions, permitted currency catalogue.

SET ROLE pay54_financial_audit_role;

SELECT pg_temp.assert_financial_sql_denied();

DO $$
DECLARE
    v_count BIGINT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM pay54.currencies;

    IF v_count < 1 THEN
        RAISE EXCEPTION
            'FAIL: Currency catalogue unavailable';
    END IF;

    RAISE NOTICE
        'PASS: Audit role retains permitted reference-data access';
END;
$$;

RESET ROLE;

-- Executor role: no financial access until future security approval.

SET ROLE pay54_ledger_executor_role;

SELECT pg_temp.assert_financial_sql_denied();

DO $$
BEGIN
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
            'FAIL: Executor can run financial procedures';
    END IF;

    RAISE NOTICE
        'PASS: Ledger executor has no financial procedure access';
END;
$$;

RESET ROLE;

-- Verify that no PAY54 relation has a financial write grant.

DO $$
DECLARE
    v_role TEXT;
BEGIN
    FOREACH v_role IN ARRAY ARRAY[
        'pay54_financial_app_role',
        'pay54_financial_audit_role',
        'pay54_ledger_executor_role'
    ]
    LOOP
        IF EXISTS (
            SELECT 1
            FROM pg_class AS c
            JOIN pg_namespace AS n
              ON n.oid = c.relnamespace
            WHERE n.nspname = 'pay54'
              AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
              AND (
                  has_table_privilege(v_role, c.oid, 'INSERT')
                  OR has_table_privilege(v_role, c.oid, 'UPDATE')
                  OR has_table_privilege(v_role, c.oid, 'DELETE')
                  OR has_table_privilege(v_role, c.oid, 'TRUNCATE')
              )
        ) THEN
            RAISE EXCEPTION
                'FAIL: % has financial table write access',
                v_role;
        END IF;
    END LOOP;

    RAISE NOTICE
        'PASS: No restricted role can directly write financial tables';
    RAISE NOTICE
        'PAY54 DIRECT LEDGER ACCESS BOUNDARY TESTS PASSED';
END;
$$;

ROLLBACK;
