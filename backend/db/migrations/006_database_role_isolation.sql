
-- ============================================================================
-- PAY54 ENTERPRISE DATABASE ROLE ISOLATION
-- File: backend/db/migrations/006_database_role_isolation.sql
-- Version: 1.0.0
-- Work Package: WP-P54-BACKEND-001G.2
--
-- PostgreSQL 16+
-- Requires migrations 001 through 005.
--
-- This is a fail-closed role foundation:
--   * Create separate non-login application and audit roles.
--   * Prevent inherited access to financial records.
--   * Permit only explicitly approved non-financial operations.
--   * Preserve exclusive financial-table ownership by migration owner.
--   * Do not grant customer-data reads or money-movement execution.
--
-- No login credentials, customer funds or payment transactions created.
--
-- Role creation is cluster-wide in PostgreSQL.
-- Review existing roles before applying outside disposable CI.
-- ============================================================================

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- ============================================================================
-- PRECONDITIONS
-- ============================================================================

DO $$
BEGIN
    IF to_regclass('pay54.financial_operations') IS NULL
       OR to_regclass('pay54.ledger_entries') IS NULL
       OR to_regclass('pay54.balance_reservations') IS NULL
       OR to_regclass('pay54.outbox_events') IS NULL
       OR to_regprocedure(
           'pay54.capture_reserved_wallet_transfer(uuid,uuid)'
       ) IS NULL
       OR to_regprocedure(
           'pay54.reserve_wallet_transfer(uuid,uuid,uuid,bigint,text,text,timestamp with time zone)'
       ) IS NULL
    THEN
        RAISE EXCEPTION
            'PAY54 migrations 001-005 must be installed first';
    END IF;

    -- Never silently adopt a role that might already have members,
    -- LOGIN privileges or unrelated permissions.
    IF EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname IN (
            'pay54_financial_app_role',
            'pay54_financial_audit_role'
        )
    ) THEN
        RAISE EXCEPTION
            'PAY54 role names already exist; manual ownership review required';
    END IF;
END;
$$;

-- ============================================================================
-- NON-LOGIN, NON-OWNER PRIVILEGE ROLES
--
-- These are future privilege groups, not database login users.
-- No PASSWORD or LOGIN credential is created.
-- ============================================================================

CREATE ROLE pay54_financial_app_role
    NOLOGIN
    NOINHERIT
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOREPLICATION
    NOBYPASSRLS;

CREATE ROLE pay54_financial_audit_role
    NOLOGIN
    NOINHERIT
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOREPLICATION
    NOBYPASSRLS;

-- ============================================================================
-- CLEAR EXISTING AND INHERITED FINANCIAL-SCHEMA GRANTS
--
-- There should be no existing grants on these freshly created roles.
-- Explicit revocation documents and enforces our baseline.
-- ============================================================================

REVOKE ALL ON SCHEMA pay54 FROM PUBLIC;

REVOKE ALL ON ALL TABLES
    IN SCHEMA pay54
    FROM PUBLIC;

REVOKE ALL ON ALL SEQUENCES
    IN SCHEMA pay54
    FROM PUBLIC;

REVOKE EXECUTE ON ALL FUNCTIONS
    IN SCHEMA pay54
    FROM PUBLIC;

REVOKE ALL ON SCHEMA pay54
    FROM pay54_financial_app_role,
         pay54_financial_audit_role;

REVOKE ALL ON ALL TABLES
    IN SCHEMA pay54
    FROM pay54_financial_app_role,
         pay54_financial_audit_role;

REVOKE ALL ON ALL SEQUENCES
    IN SCHEMA pay54
    FROM pay54_financial_app_role,
         pay54_financial_audit_role;

REVOKE EXECUTE ON ALL FUNCTIONS
    IN SCHEMA pay54
    FROM pay54_financial_app_role,
         pay54_financial_audit_role;

-- Schema USAGE permits resolution of explicitly granted objects.
-- It does NOT allow creating tables or altering schema objects.

GRANT USAGE ON SCHEMA pay54
    TO pay54_financial_app_role,
       pay54_financial_audit_role;

-- ============================================================================
-- SAFE READ-ONLY EXECUTION STATUS
--
-- Contains no customer information and never accesses the ledger.
--
-- This status refers ONLY to trusted financial execution readiness.
-- It does not claim the development dashboard is unavailable.
-- ============================================================================

CREATE FUNCTION pay54.financial_execution_status()
RETURNS TABLE (
    execution_enabled BOOLEAN,
    execution_mode TEXT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
    SELECT
        FALSE,
        'DISABLED_PENDING_TRUSTED_EXECUTION'::TEXT;
$$;

-- Revoke before granting, in the same transaction, so the function
-- is never committed with PUBLIC execution privileges.

REVOKE ALL
ON FUNCTION pay54.financial_execution_status()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION pay54.financial_execution_status()
TO pay54_financial_app_role;

-- Auditors may read the non-customer currency catalogue only.
-- They receive no wallet balances, reservations or transaction data.

GRANT SELECT
ON pay54.currencies
TO pay54_financial_audit_role;

-- ============================================================================
-- VERIFY THE INTENDED ACCESS MATRIX
-- ============================================================================

DO $$
DECLARE
    v_role TEXT;
    v_record RECORD;
BEGIN
    FOR v_role IN
        SELECT unnest(ARRAY[
            'pay54_financial_app_role',
            'pay54_financial_audit_role'
        ])
    LOOP
        SELECT *
          INTO v_record
          FROM pg_roles
         WHERE rolname = v_role;

        IF NOT FOUND
           OR v_record.rolcanlogin
           OR v_record.rolsuper
           OR v_record.rolcreatedb
           OR v_record.rolcreaterole
           OR v_record.rolreplication
           OR v_record.rolbypassrls
           OR v_record.rolinherit
        THEN
            RAISE EXCEPTION
                'PAY54 role % has unsafe role attributes',
                v_role;
        END IF;

        IF EXISTS (
            SELECT 1
            FROM pg_auth_members AS m
            JOIN pg_roles AS r ON r.oid = m.roleid
            WHERE r.rolname = v_role
        ) THEN
            RAISE EXCEPTION
                'PAY54 role % unexpectedly has members',
                v_role;
        END IF;

        IF EXISTS (
            SELECT 1
            FROM pg_class AS c
            JOIN pg_namespace AS n
              ON n.oid = c.relnamespace
            WHERE n.nspname = 'pay54'
              AND c.relowner = v_record.oid
        ) THEN
            RAISE EXCEPTION
                'PAY54 restricted role % owns a financial object',
                v_role;
        END IF;

        IF has_table_privilege(
            v_role,
            'pay54.financial_operations',
            'SELECT'
        ) OR has_table_privilege(
            v_role,
            'pay54.ledger_entries',
            'INSERT'
        ) OR has_table_privilege(
            v_role,
            'pay54.balance_reservations',
            'UPDATE'
        ) OR has_table_privilege(
            v_role,
            'pay54.outbox_events',
            'DELETE'
        ) THEN
            RAISE EXCEPTION
                'PAY54 role % has direct financial-table privileges',
                v_role;
        END IF;

        IF has_function_privilege(
            v_role,
            'pay54.capture_reserved_wallet_transfer(uuid,uuid)',
            'EXECUTE'
        ) OR has_function_privilege(
            v_role,
            'pay54.release_reserved_wallet_transfer(uuid,uuid,text)',
            'EXECUTE'
        ) OR has_function_privilege(
            v_role,
            'pay54.reserve_wallet_transfer(uuid,uuid,uuid,bigint,text,text,timestamp with time zone)',
            'EXECUTE'
        ) THEN
            RAISE EXCEPTION
                'PAY54 role % can execute financial operations',
                v_role;
        END IF;
    END LOOP;

    IF NOT has_function_privilege(
        'pay54_financial_app_role',
        'pay54.financial_execution_status()',
        'EXECUTE'
    ) THEN
        RAISE EXCEPTION
            'Financial application role lacks safe status access';
    END IF;

    IF NOT has_table_privilege(
        'pay54_financial_audit_role',
        'pay54.currencies',
        'SELECT'
    ) THEN
        RAISE EXCEPTION
            'Audit role lacks currency catalogue access';
    END IF;

    IF has_table_privilege(
        'pay54_financial_app_role',
        'pay54.currencies',
        'SELECT'
    ) OR has_function_privilege(
        'pay54_financial_audit_role',
        'pay54.financial_execution_status()',
        'EXECUTE'
    ) THEN
        RAISE EXCEPTION
            'PAY54 roles have privileges beyond their approved scopes';
    END IF;

    RAISE NOTICE
        'PASS: PAY54 database role privilege baseline enforced';
END;
$$;

COMMIT;
