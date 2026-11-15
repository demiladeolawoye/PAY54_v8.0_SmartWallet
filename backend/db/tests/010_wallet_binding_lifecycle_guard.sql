-- PAY54 Batch 03 / migration 010 lifecycle and revocation test.
-- Disposable PostgreSQL 16 only; all fixture data is rolled back.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout='30s';
SET LOCAL lock_timeout='5s';

DO $$
DECLARE
 p UUID:='11111111-1111-4111-8111-111111111111';
 other UUID:='66666666-6666-4666-8666-666666666666';
 personal UUID:='22222222-2222-4222-8222-222222222222';
 w_bound UUID:='44444444-4444-4444-8444-444444444444';
 w_unbound UUID:='55555555-5555-4555-8555-555555555555';
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_trigger
  WHERE tgrelid='pay54.wallets'::regclass
  AND tgname='wallet_bound_owner_immutable' AND NOT tgisinternal) THEN
  RAISE EXCEPTION 'Wallet identity guard missing';
 END IF;

 INSERT INTO pay54.account_contexts
 (id,legal_owner_subject,account_type,display_name,status,verification_status)
 VALUES(personal,p,'PERSONAL','Verified owner','ACTIVE','VERIFIED');
 INSERT INTO pay54.account_memberships(account_id,principal_subject,role,status)
 VALUES(personal,p,'PERSONAL_OWNER','ACTIVE');
 INSERT INTO pay54.wallets(id,owner_subject,market_code)
 VALUES(w_bound,p,'GB'),(w_unbound,p,'GB');
 INSERT INTO pay54.personal_wallet_bindings(wallet_id,account_id)
 VALUES(w_bound,personal);

 BEGIN
   UPDATE pay54.wallets SET owner_subject=other WHERE id=w_bound;
   RAISE EXCEPTION 'UNSAFE_BOUND_OWNER_CHANGED';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM='UNSAFE_BOUND_OWNER_CHANGED' THEN RAISE; END IF;
 END;

 -- Non-owner fields must remain compatible with the existing wallet lifecycle.
 UPDATE pay54.wallets SET status='SUSPENDED' WHERE id=w_bound;
 IF (SELECT status FROM pay54.wallets WHERE id=w_bound)<>'SUSPENDED' THEN
   RAISE EXCEPTION 'Existing wallet suspension broken';
 END IF;

 -- Other existing wallets were never linked; retain legacy semantics.
 UPDATE pay54.wallets SET owner_subject=other WHERE id=w_unbound;
 IF (SELECT owner_subject FROM pay54.wallets WHERE id=w_unbound)<>other THEN
   RAISE EXCEPTION 'Unbound legacy wallet update unexpectedly forbidden';
 END IF;

 -- Revocation must be permitted immediately, without deleting financial history.
 UPDATE pay54.account_memberships
 SET status='REVOKED' WHERE account_id=personal AND principal_subject=p;
 IF (SELECT status FROM pay54.account_memberships WHERE account_id=personal AND principal_subject=p)<>'REVOKED' THEN
   RAISE EXCEPTION 'Membership revocation blocked';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pay54.personal_wallet_bindings WHERE wallet_id=w_bound) THEN
   RAISE EXCEPTION 'Binding history unexpectedly deleted';
 END IF;
 IF EXISTS(SELECT 1 FROM pay54.financial_operations)
  OR EXISTS(SELECT 1 FROM pay54.ledger_entries)
  OR EXISTS(SELECT 1 FROM pay54.balance_reservations)
 THEN RAISE EXCEPTION 'Lifecycle changes created financial records'; END IF;

 RAISE NOTICE 'PASS: bound owner immutable, legacy unbound unaffected, revocation preserved';
END;
$$;
ROLLBACK;

DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM pay54.wallets)
  OR EXISTS(SELECT 1 FROM pay54.personal_wallet_bindings)
  OR EXISTS(SELECT 1 FROM pay54.account_contexts)
 THEN RAISE EXCEPTION 'Synthetic account fixtures persisted'; END IF;
 RAISE NOTICE 'PASS: all lifecycle fixtures rolled back';
END;
$$;
