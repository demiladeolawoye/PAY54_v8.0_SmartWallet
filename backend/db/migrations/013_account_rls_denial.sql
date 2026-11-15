-- PAY54 BATCH 06 — migration 013, source-only deny-by-default RLS blueprint.
-- Requires 001–012. No GRANT, login, membership or runtime activation.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';

DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='pay54_account_reader_role'
    AND NOT rolcanlogin AND NOT rolbypassrls AND NOT rolsuper)
 OR to_regclass('pay54.account_contexts') IS NULL
 OR to_regclass('pay54.account_memberships') IS NULL
 OR to_regclass('pay54.personal_wallet_bindings') IS NULL
 THEN RAISE EXCEPTION 'Reader role and existing account schema must be verified'; END IF;
END;
$$;

-- Explicitly deny reads for the inert account reader role. PostgreSQL ORs
-- permissive policies, so these are RESTRICTIVE: a future permissive grant
-- cannot override them until a separately approved migration replaces them.
CREATE POLICY pay54_reader_account_deny ON pay54.account_contexts
 AS RESTRICTIVE FOR SELECT TO pay54_account_reader_role USING (false);
CREATE POLICY pay54_reader_membership_deny ON pay54.account_memberships
 AS RESTRICTIVE FOR SELECT TO pay54_account_reader_role USING (false);
CREATE POLICY pay54_reader_wallet_binding_deny ON pay54.personal_wallet_bindings
 AS RESTRICTIVE FOR SELECT TO pay54_account_reader_role USING (false);

ALTER TABLE pay54.account_contexts FORCE ROW LEVEL SECURITY;
ALTER TABLE pay54.account_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE pay54.personal_wallet_bindings FORCE ROW LEVEL SECURITY;

-- No account authorisation from request variables, no role membership, no
-- financial privileges, no runtime user sessions or customer information.
COMMIT;
