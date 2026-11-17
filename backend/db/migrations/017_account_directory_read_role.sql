-- PAY54 Batch 22 / 845 — migration 017.
-- New unassigned NOLOGIN directory reader for canonical account_contexts.
-- The original pay54_account_reader_role remains zero-access, protected
-- by restrictive DENY policies created by migration 013.
-- No login membership or production access granted by this migration.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';

DO $$
BEGIN
  IF to_regclass('pay54.account_contexts') IS NULL OR
     to_regclass('pay54.account_memberships') IS NULL OR
     NOT EXISTS (
       SELECT 1 FROM pg_roles
        WHERE rolname='pay54_account_reader_role'
          AND NOT rolcanlogin AND NOT rolbypassrls
     ) THEN
    RAISE EXCEPTION 'PAY54_EXISTING_ACCOUNT_DENIAL_FOUNDATION_REQUIRED';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname='pay54_account_directory_read_role'
  ) THEN
    RAISE EXCEPTION 'PAY54_DIRECTORY_READ_ROLE_CONFLICT_REVIEW_REQUIRED';
  END IF;
END
$$;

CREATE ROLE pay54_account_directory_read_role
  NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS
  NOCREATEDB NOCREATEROLE NOREPLICATION;

GRANT USAGE ON SCHEMA pay54 TO pay54_account_directory_read_role;
GRANT SELECT ON pay54.account_contexts,pay54.account_memberships
  TO pay54_account_directory_read_role;

CREATE POLICY pay54_directory_member_actor_read ON pay54.account_memberships
 FOR SELECT TO pay54_account_directory_read_role
 USING (
   principal_subject =
      NULLIF(current_setting('pay54.actor_id',true),'')::uuid
   AND status='ACTIVE'
 );

CREATE POLICY pay54_directory_account_actor_read ON pay54.account_contexts
 FOR SELECT TO pay54_account_directory_read_role
 USING (
   status='ACTIVE'
   AND verification_status='VERIFIED'
   AND EXISTS (
     SELECT 1 FROM pay54.account_memberships m
      WHERE m.account_id=account_contexts.id
        AND m.principal_subject =
          NULLIF(current_setting('pay54.actor_id',true),'')::uuid
        AND m.status='ACTIVE'
   )
 );

ALTER TABLE pay54.account_contexts FORCE ROW LEVEL SECURITY;
ALTER TABLE pay54.account_memberships FORCE ROW LEVEL SECURITY;
COMMIT;
