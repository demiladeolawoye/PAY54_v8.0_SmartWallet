-- PAY54 Batch 22 / 836 — PostgreSQL membership and account lifecycle RLS.
-- Disposable DB only. Run after 001_rls_tenant_isolation.sql.
\set ON_ERROR_STOP on

BEGIN;
UPDATE pay54.account_memberships SET status = 'SUSPENDED'
 WHERE account_id='33333333-3333-4333-8333-333333333333'
   AND principal_subject='22222222-2222-4222-8222-222222222222';
SET ROLE pay54_account_directory_read_role;
SELECT set_config('pay54.actor_id','22222222-2222-4222-8222-222222222222',true);
SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END)
 AS suspended_business_membership_hidden
 FROM pay54.account_contexts;
RESET ROLE;
ROLLBACK;

BEGIN;
UPDATE pay54.account_contexts SET status = 'SUSPENDED'
 WHERE account_id='33333333-3333-4333-8333-333333333333';
SET ROLE pay54_account_directory_read_role;
SELECT set_config('pay54.actor_id','11111111-1111-4111-8111-111111111111',true);
SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END)
 AS suspended_business_account_hidden
 FROM pay54.account_contexts;
RESET ROLE;
ROLLBACK;

BEGIN;
UPDATE pay54.account_memberships SET status='REVOKED'
 WHERE account_id='11111111-1111-4111-8111-111111111111'
   AND principal_subject='11111111-1111-4111-8111-111111111111';
SET ROLE pay54_account_directory_read_role;
SELECT set_config('pay54.actor_id','11111111-1111-4111-8111-111111111111',true);
SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END)
 AS revoked_personal_membership_hidden
 FROM pay54.account_contexts;
RESET ROLE;
ROLLBACK;
