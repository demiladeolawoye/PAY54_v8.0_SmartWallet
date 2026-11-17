-- PAY54 Batch 22 / 849 — verify existing migration 008 owner/role triggers.
-- Only the canonical account_contexts/account_memberships tables are used.
\set ON_ERROR_STOP on
DO $$
DECLARE message text;
BEGIN
  BEGIN
    INSERT INTO pay54.account_memberships(account_id,principal_subject,role,status)
    VALUES('11111111-1111-4111-8111-111111111111',
           '44444444-4444-4444-8444-444444444444',
           'BUSINESS_ADMIN','ACTIVE');
    RAISE EXCEPTION 'PAY54_TEST_PERSONAL_ROLE_BYPASS';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS message = MESSAGE_TEXT;
    IF message <> 'Membership role and account owner mismatch' THEN RAISE; END IF;
  END;

  BEGIN
    INSERT INTO pay54.account_memberships(account_id,principal_subject,role,status)
    VALUES('11111111-1111-4111-8111-111111111111',
           '44444444-4444-4444-8444-444444444444',
           'PERSONAL_OWNER','ACTIVE');
    RAISE EXCEPTION 'PAY54_TEST_PERSONAL_OWNER_FORGERY';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS message = MESSAGE_TEXT;
    IF message <> 'Membership role and account owner mismatch' THEN RAISE; END IF;
  END;

  BEGIN
    INSERT INTO pay54.account_memberships(account_id,principal_subject,role,status)
    VALUES('33333333-3333-4333-8333-333333333333',
           '44444444-4444-4444-8444-444444444444',
           'PERSONAL_OWNER','ACTIVE');
    RAISE EXCEPTION 'PAY54_TEST_BUSINESS_ROLE_BYPASS';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS message = MESSAGE_TEXT;
    IF message <> 'Membership role and account owner mismatch' THEN RAISE; END IF;
  END;

  BEGIN
    UPDATE pay54.account_contexts SET account_type='BUSINESS'
    WHERE id='11111111-1111-4111-8111-111111111111';
    RAISE EXCEPTION 'PAY54_TEST_ACCOUNT_TYPE_BYPASS';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS message = MESSAGE_TEXT;
    IF message <> 'Account identity and ownership cannot be reassigned' THEN RAISE; END IF;
  END;

  BEGIN
    UPDATE pay54.account_contexts
      SET legal_owner_subject='44444444-4444-4444-8444-444444444444'
    WHERE id='11111111-1111-4111-8111-111111111111';
    RAISE EXCEPTION 'PAY54_TEST_LEGAL_OWNER_BYPASS';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS message = MESSAGE_TEXT;
    IF message <> 'Account identity and ownership cannot be reassigned' THEN RAISE; END IF;
  END;
END
$$;

SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END) AS no_forged_membership
FROM pay54.account_memberships
WHERE principal_subject='44444444-4444-4444-8444-444444444444';
