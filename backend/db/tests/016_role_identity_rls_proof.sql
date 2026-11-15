-- PAY54 Batch 08 / disposable PostgreSQL only.
-- Positive role-based RLS proof using *test-only* relations and NOLOGIN actors.
-- Every role, policy, row and GRANT is rolled back. Never apply to production.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
CREATE ROLE pay54_ci_tenant_aa NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
CREATE ROLE pay54_ci_tenant_bb NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
CREATE SCHEMA pay54_ci_tenant AUTHORIZATION CURRENT_USER;
CREATE TABLE pay54_ci_tenant.proof (
 id integer PRIMARY KEY,
 db_actor text NOT NULL,
 content text NOT NULL
);
INSERT INTO pay54_ci_tenant.proof VALUES
 (1,'pay54_ci_tenant_aa','TENANT_A'),
 (2,'pay54_ci_tenant_bb','TENANT_B');
ALTER TABLE pay54_ci_tenant.proof ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54_ci_tenant.proof FORCE ROW LEVEL SECURITY;
CREATE POLICY pay54_ci_actor_only ON pay54_ci_tenant.proof
 FOR SELECT TO PUBLIC USING (db_actor = current_user);
GRANT USAGE ON SCHEMA pay54_ci_tenant TO pay54_ci_tenant_aa, pay54_ci_tenant_bb;
GRANT SELECT ON pay54_ci_tenant.proof TO pay54_ci_tenant_aa, pay54_ci_tenant_bb;

SET ROLE pay54_ci_tenant_aa;
DO $$
BEGIN
 IF (SELECT count(*) FROM pay54_ci_tenant.proof)<>1
 OR NOT EXISTS(SELECT 1 FROM pay54_ci_tenant.proof WHERE content='TENANT_A')
 OR EXISTS(SELECT 1 FROM pay54_ci_tenant.proof WHERE content='TENANT_B')
 THEN RAISE EXCEPTION 'Role AA tenant boundary violated'; END IF;
END;
$$;
RESET ROLE;
SET ROLE pay54_ci_tenant_bb;
DO $$
BEGIN
 IF (SELECT count(*) FROM pay54_ci_tenant.proof)<>1
 OR NOT EXISTS(SELECT 1 FROM pay54_ci_tenant.proof WHERE content='TENANT_B')
 OR EXISTS(SELECT 1 FROM pay54_ci_tenant.proof WHERE content='TENANT_A')
 THEN RAISE EXCEPTION 'Role BB tenant boundary violated'; END IF;
END;
$$;
RESET ROLE;
ROLLBACK;

DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('pay54_ci_tenant_aa','pay54_ci_tenant_bb'))
 OR to_regclass('pay54_ci_tenant.proof') IS NOT NULL
 THEN RAISE EXCEPTION 'Test-only tenant role or schema survived rollback'; END IF;
 IF has_table_privilege('pay54_account_reader_role','pay54.account_contexts','SELECT')
 THEN RAISE EXCEPTION 'Production reader role unexpectedly gained customer access'; END IF;
 RAISE NOTICE 'PASS: actor-scoped positive/negative role proof and rollback';
END;
$$;
