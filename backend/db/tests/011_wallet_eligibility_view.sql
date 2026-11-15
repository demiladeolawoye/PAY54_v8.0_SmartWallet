-- PAY54 BATCH 03 / migration 011 eligibility lifecycle tests
-- PostgreSQL 16 disposable CI; all fixtures rolled back.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';

DO $$
DECLARE
 p UUID:='11111111-1111-4111-8111-111111111111';
 a UUID:='22222222-2222-4222-8222-222222222222';
 w UUID:='44444444-4444-4444-8444-444444444444';
BEGIN
 IF EXISTS (
  SELECT 1 FROM pg_roles r
  WHERE r.rolname IN ('pay54_financial_app_role','pay54_financial_audit_role','pay54_ledger_executor_role')
    AND has_table_privilege(r.rolname,'pay54.eligible_personal_wallet_bindings','SELECT')
 ) THEN RAISE EXCEPTION 'Restricted roles unexpectedly can view account wallet IDs'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.oid='pay54.eligible_personal_wallet_bindings'::regclass
   AND c.relkind='v'
   AND EXISTS (SELECT 1 FROM pg_options_to_table(c.reloptions) WHERE option_name='security_invoker' AND option_value='true'))
 THEN RAISE EXCEPTION 'Eligibility view must be security invoker'; END IF;

 INSERT INTO pay54.account_contexts(id,legal_owner_subject,account_type,display_name,status,verification_status)
 VALUES(a,p,'PERSONAL','Verified Personal','ACTIVE','VERIFIED');
 INSERT INTO pay54.account_memberships(account_id,principal_subject,role,status)
 VALUES(a,p,'PERSONAL_OWNER','ACTIVE');
 INSERT INTO pay54.wallets(id,owner_subject,market_code,status)
 VALUES(w,p,'GB','ACTIVE');
 INSERT INTO pay54.personal_wallet_bindings(wallet_id,account_id)
 VALUES(w,a);
 IF (SELECT COUNT(*) FROM pay54.eligible_personal_wallet_bindings WHERE account_id=a AND principal_subject=p)<>1 THEN
  RAISE EXCEPTION 'Verified owner wallet not visible';
 END IF;

 UPDATE pay54.account_memberships SET status='REVOKED' WHERE account_id=a;
 IF EXISTS (SELECT 1 FROM pay54.eligible_personal_wallet_bindings WHERE account_id=a) THEN
  RAISE EXCEPTION 'Revoked wallet remains eligible';
 END IF;
 UPDATE pay54.account_memberships SET status='ACTIVE' WHERE account_id=a;

 UPDATE pay54.account_contexts SET status='SUSPENDED' WHERE id=a;
 IF EXISTS (SELECT 1 FROM pay54.eligible_personal_wallet_bindings WHERE account_id=a) THEN
  RAISE EXCEPTION 'Suspended account wallet remains eligible';
 END IF;
 UPDATE pay54.account_contexts SET status='ACTIVE' WHERE id=a;

 UPDATE pay54.wallets SET status='SUSPENDED' WHERE id=w;
 IF EXISTS (SELECT 1 FROM pay54.eligible_personal_wallet_bindings WHERE account_id=a) THEN
  RAISE EXCEPTION 'Suspended wallet remains eligible';
 END IF;

 IF EXISTS (SELECT 1 FROM pay54.financial_operations)
    OR EXISTS (SELECT 1 FROM pay54.ledger_entries)
 THEN RAISE EXCEPTION 'Eligibility view tests created financial records'; END IF;
 RAISE NOTICE 'PASS: wallet visibility revokes immediately with membership/account/wallet lifecycle';
END;
$$;

ROLLBACK;
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM pay54.wallets)
    OR EXISTS(SELECT 1 FROM pay54.account_contexts)
 THEN RAISE EXCEPTION 'Eligibility fixtures survived rollback'; END IF;
 RAISE NOTICE 'PASS: eligibility fixtures rolled back';
END;
$$;
