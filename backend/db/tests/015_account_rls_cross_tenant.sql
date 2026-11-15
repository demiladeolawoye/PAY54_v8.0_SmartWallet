-- PAY54 Batch 07 / disposable CI only, 015 RLS cross-tenant denial.
-- Any ephemeral GRANT is enclosed in rollback and MUST NEVER deploy.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
DECLARE
 p UUID := '11111111-1111-4111-8111-111111111111';
 q UUID := '22222222-2222-4222-8222-222222222222';
 a UUID := '33333333-3333-4333-8333-333333333333';
 b UUID := '44444444-4444-4444-8444-444444444444';
BEGIN
 INSERT INTO pay54.account_contexts(id,legal_owner_subject,account_type,display_name,status,verification_status)
 VALUES (a,p,'PERSONAL','Tenant A','ACTIVE','VERIFIED'),
        (b,q,'PERSONAL','Tenant B','ACTIVE','VERIFIED');
 INSERT INTO pay54.account_memberships(account_id,principal_subject,role,status)
 VALUES (a,p,'PERSONAL_OWNER','ACTIVE'),(b,q,'PERSONAL_OWNER','ACTIVE');
END;
$$;

-- A SECURITY-REVIEWER SIMULATION ONLY: temporary SELECT is rolled back below.
GRANT SELECT ON pay54.account_contexts TO pay54_account_reader_role;
GRANT SELECT ON pay54.account_memberships TO pay54_account_reader_role;
SET ROLE pay54_account_reader_role;
DO $$
BEGIN
 IF (SELECT count(*) FROM pay54.account_contexts)<>0 THEN
  RAISE EXCEPTION 'RLS leaked account records';
 END IF;
 IF (SELECT count(*) FROM pay54.account_memberships)<>0 THEN
  RAISE EXCEPTION 'RLS leaked membership records';
 END IF;
END;
$$;
RESET ROLE;
ROLLBACK;

-- No transient fixtures or privileges may survive.
DO $$
BEGIN
 IF has_table_privilege('pay54_account_reader_role','pay54.account_contexts','SELECT')
   OR has_table_privilege('pay54_account_reader_role','pay54.account_memberships','SELECT') THEN
  RAISE EXCEPTION 'Test-only privilege survived rollback';
 END IF;
 IF EXISTS(SELECT 1 FROM pay54.account_contexts) OR
    EXISTS(SELECT 1 FROM pay54.account_memberships) THEN
  RAISE EXCEPTION 'Test-only fixture survived rollback';
 END IF;
 RAISE NOTICE 'PASS: cross-tenant RLS deny-only isolation and rollback';
END;
$$;
