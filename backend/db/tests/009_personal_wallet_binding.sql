-- PAY54 BATCH 02 / Legacy personal wallet binding tests
-- PostgreSQL 16+ disposable CI only; migrations 001-009.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
DECLARE
  v_person UUID := '11111111-1111-4111-8111-111111111111';
  v_other UUID := '66666666-6666-4666-8666-666666666666';
  v_personal UUID := '22222222-2222-4222-8222-222222222222';
  v_business UUID := '33333333-3333-4333-8333-333333333333';
  v_wallet UUID := '44444444-4444-4444-8444-444444444444';
  v_other_wallet UUID := '55555555-5555-4555-8555-555555555555';
BEGIN
  IF NOT (SELECT relrowsecurity AND relforcerowsecurity
          FROM pg_class WHERE oid='pay54.personal_wallet_bindings'::regclass) THEN
    RAISE EXCEPTION 'Personal wallet binding must force row-level security';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_roles r
    WHERE r.rolname IN ('pay54_financial_app_role','pay54_financial_audit_role','pay54_ledger_executor_role')
      AND (
        has_table_privilege(r.rolname,'pay54.personal_wallet_bindings','SELECT')
        OR has_table_privilege(r.rolname,'pay54.personal_wallet_bindings','INSERT')
        OR has_table_privilege(r.rolname,'pay54.personal_wallet_bindings','UPDATE')
        OR has_table_privilege(r.rolname,'pay54.personal_wallet_bindings','DELETE')
      )
  ) THEN RAISE EXCEPTION 'Restricted roles gained wallet binding privileges'; END IF;

  INSERT INTO pay54.account_contexts
    (id,legal_owner_subject,account_type,display_name,status,verification_status)
  VALUES
    (v_personal,v_person,'PERSONAL','Verified personal','ACTIVE','VERIFIED'),
    (v_business,v_person,'BUSINESS','Verified business','ACTIVE','VERIFIED');

  INSERT INTO pay54.account_memberships
    (account_id,principal_subject,role,status)
  VALUES
    (v_personal,v_person,'PERSONAL_OWNER','ACTIVE'),
    (v_business,v_person,'BUSINESS_OWNER','ACTIVE');

  INSERT INTO pay54.wallets(id,owner_subject,market_code)
  VALUES (v_wallet,v_person,'GB'),(v_other_wallet,v_other,'GB');

  INSERT INTO pay54.personal_wallet_bindings(wallet_id,account_id)
  VALUES(v_wallet,v_personal);

  IF (SELECT COUNT(*) FROM pay54.personal_wallet_bindings) <> 1 THEN
    RAISE EXCEPTION 'Missing legitimate personal wallet binding';
  END IF;

  BEGIN
    INSERT INTO pay54.personal_wallet_bindings(wallet_id,account_id)
    VALUES(v_other_wallet,v_personal);
    RAISE EXCEPTION 'UNSAFE_CROSS_OWNER_BINDING';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM='UNSAFE_CROSS_OWNER_BINDING' THEN RAISE; END IF;
  END;

  BEGIN
    INSERT INTO pay54.personal_wallet_bindings(wallet_id,account_id)
    VALUES(v_other_wallet,v_business);
    RAISE EXCEPTION 'UNSAFE_BUSINESS_BINDING';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM='UNSAFE_BUSINESS_BINDING' THEN RAISE; END IF;
  END;

  BEGIN
    UPDATE pay54.personal_wallet_bindings SET account_id=v_business WHERE wallet_id=v_wallet;
    RAISE EXCEPTION 'UNSAFE_BINDING_REASSIGNMENT';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM='UNSAFE_BINDING_REASSIGNMENT' THEN RAISE; END IF;
  END;

  BEGIN
    DELETE FROM pay54.personal_wallet_bindings WHERE wallet_id=v_wallet;
    RAISE EXCEPTION 'UNSAFE_BINDING_DELETION';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM='UNSAFE_BINDING_DELETION' THEN RAISE; END IF;
  END;

  IF EXISTS (SELECT 1 FROM pay54.financial_operations)
     OR EXISTS (SELECT 1 FROM pay54.ledger_entries)
     OR EXISTS (SELECT 1 FROM pay54.balance_reservations)
  THEN RAISE EXCEPTION 'Financial records unexpectedly created'; END IF;
  RAISE NOTICE 'PASS: personal wallet binding enforces verified owner and denies business or reassignment';
END;
$$;

ROLLBACK;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pay54.personal_wallet_bindings)
     OR EXISTS (SELECT 1 FROM pay54.account_contexts)
     OR EXISTS (SELECT 1 FROM pay54.wallets)
  THEN RAISE EXCEPTION 'Disposable wallet fixture survived rollback'; END IF;
  RAISE NOTICE 'PASS: No wallet or account fixture persisted';
END;
$$;
