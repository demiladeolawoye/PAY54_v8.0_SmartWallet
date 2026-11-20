-- PAY54 CR-PAYTAG-01 P2B-B2B4 / migration 026.
-- SOURCE ONLY. Dedicated inert PayTag execution identity; NO execution authority.
-- Applies only after reviewed migration 025 in disposable PostgreSQL 16+.
-- No LOGIN, membership, RLS policy, table privileges, function grant or route.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $preflight$
BEGIN
  IF to_regprocedure(
    'pay54.register_paytag_trusted(bytea,bytea,uuid,bigint,uuid,uuid,text,bytea,bytea,uuid,uuid)'
  ) IS NULL
  OR to_regclass('pay54.paytag_registry') IS NULL
  OR to_regclass('pay54.paytag_registry_audit') IS NULL
  OR to_regclass('pay54.paytag_registration_requests') IS NULL
  OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname='pay54_paytag_register_role')
  THEN
    RAISE EXCEPTION 'PAY54_PAYTAG_ROLE_FOUNDATION_REVIEW_REQUIRED'
      USING ERRCODE='P0001';
  END IF;
END
$preflight$;

-- Cluster-wide role creation is never automatic outside an approved migration.
-- This is an inert privilege identity; not an application LOGIN account.
CREATE ROLE pay54_paytag_register_role
  NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS
  NOCREATEDB NOCREATEROLE NOREPLICATION;

REVOKE ALL ON SCHEMA pay54 FROM pay54_paytag_register_role;
REVOKE ALL ON ALL TABLES IN SCHEMA pay54 FROM pay54_paytag_register_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA pay54 FROM pay54_paytag_register_role;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA pay54 FROM pay54_paytag_register_role;

-- The writer remains forbidden even to the new inert identity.
REVOKE ALL ON FUNCTION pay54.register_paytag_trusted(
  bytea,bytea,uuid,bigint,uuid,uuid,text,bytea,bytea,uuid,uuid
) FROM pay54_paytag_register_role;

DO $assert$
DECLARE v_role oid;
BEGIN
  SELECT oid INTO v_role FROM pg_roles
  WHERE rolname='pay54_paytag_register_role'
    AND NOT rolcanlogin AND NOT rolinherit AND NOT rolsuper
    AND NOT rolbypassrls AND NOT rolcreatedb AND NOT rolcreaterole
    AND NOT rolreplication;
  IF v_role IS NULL
     OR EXISTS (SELECT 1 FROM pg_auth_members
       WHERE roleid=v_role OR member=v_role)
     OR EXISTS (SELECT 1 FROM pg_class WHERE relowner=v_role)
     OR EXISTS (SELECT 1 FROM pg_proc WHERE proowner=v_role)
     OR EXISTS (SELECT 1 FROM pg_namespace WHERE nspowner=v_role)
     OR has_schema_privilege('pay54_paytag_register_role','pay54','USAGE')
     OR has_schema_privilege('pay54_paytag_register_role','pay54','CREATE')
     OR has_function_privilege('pay54_paytag_register_role',
       'pay54.register_paytag_trusted(bytea,bytea,uuid,bigint,uuid,uuid,text,bytea,bytea,uuid,uuid)',
       'EXECUTE')
     OR EXISTS (
       SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='pay54' AND c.relkind IN ('r','p','v','m','f')
         AND (has_table_privilege('pay54_paytag_register_role',c.oid,'SELECT')
          OR has_table_privilege('pay54_paytag_register_role',c.oid,'INSERT')
          OR has_table_privilege('pay54_paytag_register_role',c.oid,'UPDATE')
          OR has_table_privilege('pay54_paytag_register_role',c.oid,'DELETE'))
     )
  THEN
    RAISE EXCEPTION 'PAY54_PAYTAG_ROLE_PRIVILEGE_BOUNDARY_FAILURE'
      USING ERRCODE='P0001';
  END IF;
END
$assert$;
COMMIT;
