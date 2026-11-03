
-- ============================================================================
-- PAY54 ENTERPRISE DIRECT LEDGER ACCESS BOUNDARY
-- File: backend/db/migrations/007_direct_ledger_access_boundary.sql
-- Version: 1.0.0
-- Work Package: WP-P54-BACKEND-001G.4
--
-- PostgreSQL 16+
-- Requires migrations 001-006.
--
-- Establishes a future executor privilege group without granting
-- direct access to financial tables or payment procedures.
--
-- This migration deliberately does NOT enable financial execution.
-- Roles are cluster-wide: deploy initially in disposable CI only.
-- ============================================================================

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Verify required financial infrastructure.

DO $$
BEGIN
    IF to_regclass('pay54.ledger_entries') IS NULL
       OR to_regclass('pay54.ledger_journals') IS NULL
       OR to_regclass('pay54.balance_reservations') IS NULL
       OR to_regclass('pay54.financial_operations') IS NULL
       OR to_regclass('pay54.outbox_events') IS NULL
       OR to_regprocedure(
           'pay54.capture_reserved_wallet_transfer(uuid,uuid)'
       ) IS NULL
       OR to_regprocedure(
           'pay54.release_reserved_wallet_transfer(uuid,uuid,text)'
       ) IS NULL
    THEN
        RAISE EXCEPTION
            'PAY54 migrations 001-006 must be installed first';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname = 'pay54_financial_app_role'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname = 'pay54_financial_audit_role'
    ) THEN
        RAISE EXCEPTION
            'PAY54 database role isolation migration 006 is required';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname = 'pay54_ledger_executor_role'
    ) THEN
        RAISE EXCEPTION
            'Executor role already exists; review before migration';
    END IF;
END;
$$;

-- The executor role is reserved for a future trusted financial service.
-- NOLOGIN: It cannot authenticate as a database user.
-- NOINHERIT: No automatic role privilege inheritance.
-- No members and no database password are provisioned.

CREATE ROLE pay54_ledger_executor_role
    NOLOGIN
    NOINHERIT
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOREPLICATION
    NOBYPASSRLS;

-- Keep the PAY54 financial schema inaccessible to PUBLIC.

REVOKE ALL ON SCHEMA pay54 FROM PUBLIC;

REVOKE ALL ON ALL TABLES
IN SCHEMA pay54 FROM PUBLIC;

REVOKE ALL ON ALL SEQUENCES
IN SCHEMA pay54 FROM PUBLIC;

REVOKE EXECUTE ON ALL FUNCTIONS
IN SCHEMA pay54 FROM PUBLIC;

-- Remove every direct PAY54 privilege from the new executor.
-- These statements also document the expected access policy.

REVOKE ALL ON SCHEMA pay54
FROM pay54_ledger_executor_role;

REVOKE ALL ON ALL TABLES
IN SCHEMA pay54
FROM pay54_ledger_executor_role;

REVOKE ALL ON ALL SEQUENCES
IN SCHEMA pay54
FROM pay54_ledger_executor_role;

REVOKE EXECUTE ON ALL FUNCTIONS
IN SCHEMA pay54
FROM pay54_ledger_executor_role;

-- USAGE resolves schema names but cannot read or write tables.
-- We deliberately grant no CREATE permission.

GRANT USAGE ON SCHEMA pay54
TO pay54_ledger_executor_role;

-- Prevent newly created functions from acquiring implicit PUBLIC
-- execution privileges under the current migration owner's defaults.

ALTER DEFAULT PRIVILEGES IN SCHEMA pay54
REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Validate every restricted role.

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
                'PAY54 restricted role % has unsafe attributes',
                v_name;
        END IF;

        IF EXISTS (
            SELECT 1
            FROM pg_auth_members AS m
            WHERE m.roleid = v_role.oid
               OR m.member = v_role.oid
        ) THEN
            RAISE EXCEPTION
                'PAY54 restricted role % has unexpected membership',
                v_name;
        END IF;

        IF EXISTS (
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
                'Restricted role % owns financial database objects',
                v_name;
        END IF;

        -- This checks every table or view in the PAY54 schema,
        -- rather than a short list of representative objects.

        IF EXISTS (
            SELECT 1
            FROM pg_class AS c
            JOIN pg_namespace AS n
              ON n.oid = c.relnamespace
            WHERE n.nspname = 'pay54'
              AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
              AND (
                  has_table_privilege(
                      v_name, c.oid, 'INSERT'
                  )
                  OR has_table_privilege(
                      v_name, c.oid, 'UPDATE'
                  )
                  OR has_table_privilege(
                      v_name, c.oid, 'DELETE'
                  )
                  OR has_table_privilege(
                      v_name, c.oid, 'TRUNCATE'
                  )
              )
        ) THEN
            RAISE EXCEPTION
                'Restricted role % has direct financial write access',
                v_name;
        END IF;

        IF EXISTS (
            SELECT 1
            FROM pg_proc AS p
            JOIN pg_namespace AS n
              ON n.oid = p.pronamespace
            WHERE n.nspname = 'pay54'
              AND p.proname IN (
                  'reserve_wallet_transfer',
                  'capture_reserved_wallet_transfer',
                  'release_reserved_wallet_transfer'
              )
              AND has_function_privilege(
                  v_name, p.oid, 'EXECUTE'
              )
        ) THEN
            RAISE EXCEPTION
                'Restricted role % may execute money functions',
                v_name;
        END IF;
    END LOOP;

    IF has_table_privilege(
        'pay54_ledger_executor_role',
        'pay54.ledger_entries',
        'SELECT'
    ) OR has_table_privilege(
        'pay54_ledger_executor_role',
        'pay54.financial_operations',
        'SELECT'
    ) OR has_table_privilege(
        'pay54_ledger_executor_role',
        'pay54.outbox_events',
        'SELECT'
    ) THEN
        RAISE EXCEPTION
            'Executor role can read financial customer records';
    END IF;

    RAISE NOTICE
        'PASS: PAY54 direct ledger-write access remains denied';
END;
$$;

COMMIT;
