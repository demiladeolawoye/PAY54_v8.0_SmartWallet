-- PAY54 CR-PAYTAG-01 P2B-A negative lifecycle integration
-- Disposable PostgreSQL 16+ ONLY, run as CI superuser after migrations 001-022.
-- The entire fixture and all successful mutations are rolled back.
\set ON_ERROR_STOP on
BEGIN;

INSERT INTO pay54.wallets(id,owner_subject,market_code,status)
VALUES
 ('aaaaaaaa-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','GB','ACTIVE'),
 ('bbbbbbbb-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222222','GB','ACTIVE');

INSERT INTO pay54.personal_wallet_bindings(wallet_id,account_id) VALUES
 ('aaaaaaaa-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111'),
 ('bbbbbbbb-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222222');

INSERT INTO pay54.paytag_registry
 (tag_id,canonical_alias,owner_account_id,wallet_id,owner_principal_id,registry_state)
VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','alice_test',
  '11111111-1111-4111-8111-111111111111',
  'aaaaaaaa-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111','RESERVED');

DO $test$
DECLARE err text;
BEGIN
  IF (SELECT count(*) FROM pay54.paytag_registry_audit
      WHERE tag_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
        AND event_kind='CLAIMED' AND alias_version=1)<>1
  THEN RAISE EXCEPTION 'PAYTAG_AUDIT_CLAIM_MISSING'; END IF;

  BEGIN
    INSERT INTO pay54.paytag_registry
     (canonical_alias,owner_account_id,wallet_id,owner_principal_id,registry_state)
    VALUES('alice_test','22222222-2222-4222-8222-222222222222',
           'bbbbbbbb-2222-4222-8222-222222222222',
           '22222222-2222-4222-8222-222222222222','RESERVED');
    RAISE EXCEPTION 'PAYTAG_DUPLICATE_ALIAS_ACCEPTED';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO pay54.paytag_registry
     (canonical_alias,owner_account_id,wallet_id,owner_principal_id,registry_state)
    VALUES('wrong_owner','22222222-2222-4222-8222-222222222222',
           'bbbbbbbb-2222-4222-8222-222222222222',
           '11111111-1111-4111-8111-111111111111','RESERVED');
    RAISE EXCEPTION 'PAYTAG_FORGED_OWNER_ACCEPTED';
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS err = MESSAGE_TEXT;
    IF err <> 'PAY54_PAYTAG_ACCOUNT_SCOPE_DENIED' THEN RAISE; END IF;
  END;

  BEGIN
    UPDATE pay54.paytag_registry SET canonical_alias='stolen_alias',
      registry_version=2 WHERE canonical_alias='alice_test';
    RAISE EXCEPTION 'PAYTAG_REASSIGNMENT_ACCEPTED';
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS err = MESSAGE_TEXT;
    IF err <> 'PAY54_PAYTAG_INVALID_STATE_TRANSITION' THEN RAISE; END IF;
  END;

  BEGIN
    UPDATE pay54.paytag_registry SET registry_state='ACTIVE',registry_version=4
      WHERE canonical_alias='alice_test';
    RAISE EXCEPTION 'PAYTAG_REPLAY_VERSION_ACCEPTED';
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS err = MESSAGE_TEXT;
    IF err <> 'PAY54_PAYTAG_INVALID_STATE_TRANSITION' THEN RAISE; END IF;
  END;
END;
$test$;

UPDATE pay54.paytag_registry SET registry_state='ACTIVE', registry_version=2
WHERE canonical_alias='alice_test';
DO $test$
BEGIN
  IF (SELECT count(*) FROM pay54.paytag_registry_audit
    WHERE tag_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
      AND event_kind='ACTIVATED' AND alias_version=2)<>1
  THEN RAISE EXCEPTION 'PAYTAG_ACTIVATION_AUDIT_MISSING'; END IF;
END;
$test$;

DO $test$
DECLARE err text;
BEGIN
  BEGIN
    UPDATE pay54.paytag_registry SET registry_state='RESERVED',registry_version=3
    WHERE canonical_alias='alice_test';
    RAISE EXCEPTION 'PAYTAG_REACTIVATION_ACCEPTED';
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS err = MESSAGE_TEXT;
    IF err <> 'PAY54_PAYTAG_INVALID_STATE_TRANSITION' THEN RAISE; END IF;
  END;
END;
$test$;

UPDATE pay54.paytag_registry
 SET registry_state='RETIRED',registry_version=3,retired_at=now()
WHERE canonical_alias='alice_test';

DO $test$
DECLARE err text;
BEGIN
  IF (SELECT count(*) FROM pay54.paytag_registry_audit
    WHERE tag_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
      AND event_kind='RETIRED' AND alias_version=3)<>1
  THEN RAISE EXCEPTION 'PAYTAG_RETIREMENT_AUDIT_MISSING'; END IF;

  BEGIN
    INSERT INTO pay54.paytag_registry
     (canonical_alias,owner_account_id,wallet_id,owner_principal_id,registry_state)
    VALUES('alice_test','22222222-2222-4222-8222-222222222222',
           'bbbbbbbb-2222-4222-8222-222222222222',
           '22222222-2222-4222-8222-222222222222','RESERVED');
    RAISE EXCEPTION 'PAYTAG_RETIRED_REASSIGNMENT_ACCEPTED';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  BEGIN
    UPDATE pay54.paytag_registry SET registry_state='ACTIVE',
      retired_at=NULL,registry_version=4 WHERE canonical_alias='alice_test';
    RAISE EXCEPTION 'PAYTAG_RETIRED_REACTIVATION_ACCEPTED';
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS err = MESSAGE_TEXT;
    IF err <> 'PAY54_PAYTAG_INVALID_STATE_TRANSITION' THEN RAISE; END IF;
  END;

  BEGIN
    DELETE FROM pay54.paytag_registry WHERE canonical_alias='alice_test';
    RAISE EXCEPTION 'PAYTAG_DELETE_ACCEPTED';
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS err = MESSAGE_TEXT;
    IF err <> 'PAY54_PAYTAG_DELETE_DENIED' THEN RAISE; END IF;
  END;

  BEGIN
    DELETE FROM pay54.paytag_registry_audit
      WHERE tag_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
    RAISE EXCEPTION 'PAYTAG_AUDIT_DELETE_ACCEPTED';
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS err = MESSAGE_TEXT;
    IF err <> 'PAY54_PAYTAG_DELETE_DENIED' THEN RAISE; END IF;
  END;

  BEGIN
    UPDATE pay54.paytag_registry_audit SET event_kind='DENIED'
      WHERE tag_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
    RAISE EXCEPTION 'PAYTAG_AUDIT_UPDATE_ACCEPTED';
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS err = MESSAGE_TEXT;
    IF err <> 'PAY54_PAYTAG_DELETE_DENIED' THEN RAISE; END IF;
  END;
END;
$test$;

DO $test$
BEGIN
  IF has_table_privilege('pay54_financial_app_role','pay54.paytag_registry','INSERT')
    OR has_table_privilege('pay54_financial_app_role','pay54.paytag_registry','UPDATE')
    OR has_table_privilege('pay54_financial_app_role','pay54.paytag_registry_audit','SELECT')
  THEN RAISE EXCEPTION 'PAYTAG_APP_ROLE_GAINED_WRITE_PRIVILEGES'; END IF;
END;
$test$;
ROLLBACK;
