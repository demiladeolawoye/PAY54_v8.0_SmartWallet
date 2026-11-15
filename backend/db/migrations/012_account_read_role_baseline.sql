-- PAY54 ENTERPRISE BATCH 04 / MIGRATION 012
-- Source-only least-privilege account read role baseline.
-- PostgreSQL 16+, requires migrations 001–011.
-- This is a deliberately UNASSIGNED, NOLOGIN, zero-access role.
-- Granting SELECT before secure authenticated DB policies would expose tenants.
-- No live DB, credentials, payment or cloud operation is authorised.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';

DO $$
BEGIN
  IF to_regclass('pay54.account_contexts') IS NULL
     OR to_regclass('pay54.eligible_personal_wallet_bindings') IS NULL
     OR to_regclass('pay54.ledger_entries') IS NULL
  THEN
     RAISE EXCEPTION 'Account role baseline requires migrations 001–011';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='pay54_account_reader_role') THEN
     RAISE EXCEPTION 'Existing account reader role must undergo independent privilege review';
  END IF;
END;
$$;

-- Unlike a database login, this is a privilege group with no members,
-- no inherited privileges and no RLS bypass. Its presence alone grants nothing.
CREATE ROLE pay54_account_reader_role
  NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE
  NOREPLICATION NOBYPASSRLS;

REVOKE ALL ON SCHEMA pay54 FROM pay54_account_reader_role;
REVOKE ALL ON ALL TABLES IN SCHEMA pay54 FROM pay54_account_reader_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA pay54 FROM pay54_account_reader_role;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA pay54 FROM pay54_account_reader_role;

-- Schema USAGE permits name resolution only, not SELECT or financial execution.
GRANT USAGE ON SCHEMA pay54 TO pay54_account_reader_role;

DO $$
DECLARE
  role_row RECORD;
BEGIN
  SELECT * INTO role_row FROM pg_roles WHERE rolname='pay54_account_reader_role';
  IF NOT FOUND OR role_row.rolcanlogin OR role_row.rolinherit
     OR role_row.rolsuper OR role_row.rolbypassrls
     OR role_row.rolcreatedb OR role_row.rolcreaterole OR role_row.rolreplication
  THEN RAISE EXCEPTION 'Reader role is not least-privileged'; END IF;

  IF EXISTS (
    SELECT 1 FROM pg_auth_members
    WHERE roleid=role_row.oid OR member=role_row.oid
  ) THEN RAISE EXCEPTION 'Reader role unexpectedly has membership'; END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='pay54' AND c.relowner=role_row.oid
  ) OR EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='pay54' AND p.proowner=role_row.oid
  ) THEN RAISE EXCEPTION 'Reader role unexpectedly owns PAY54 objects'; END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='pay54' AND c.relkind IN ('r','p','v','m','f')
      AND (has_table_privilege(role_row.rolname,c.oid,'SELECT')
        OR has_table_privilege(role_row.rolname,c.oid,'INSERT')
        OR has_table_privilege(role_row.rolname,c.oid,'UPDATE')
        OR has_table_privilege(role_row.rolname,c.oid,'DELETE')
        OR has_table_privilege(role_row.rolname,c.oid,'TRUNCATE'))
  ) THEN RAISE EXCEPTION 'Reader role gained unreviewed table access'; END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='pay54' AND has_function_privilege(role_row.rolname,p.oid,'EXECUTE')
  ) THEN RAISE EXCEPTION 'Reader role gained function execution'; END IF;
END;
$$;

-- No login grants, role membership, customer reads, RLS policy or money access.
COMMIT;
