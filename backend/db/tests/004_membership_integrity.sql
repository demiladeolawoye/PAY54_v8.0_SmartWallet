-- PAY54 Batch 22 / 839: real PostgreSQL membership integrity regression.
-- Run as owner on disposable database after seeded RLS fixtures.
\set ON_ERROR_STOP on

DO $$
BEGIN
  BEGIN
    INSERT INTO pay54.account_memberships(account_id,principal_id,member_role,member_status)
    VALUES ('11111111-1111-4111-8111-111111111111',
            '44444444-4444-4444-8444-444444444444',
            'BUSINESS_ADMIN','ACTIVE');
    RAISE EXCEPTION 'PAY54_TEST_PERSONAL_ROLE_BYPASS';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO pay54.account_memberships(account_id,principal_id,member_role,member_status)
    VALUES ('11111111-1111-4111-8111-111111111111',
            '44444444-4444-4444-8444-444444444444',
            'PERSONAL_OWNER','ACTIVE');
    RAISE EXCEPTION 'PAY54_TEST_PERSONAL_OWNER_FORGERY';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO pay54.account_memberships(account_id,principal_id,member_role,member_status)
    VALUES ('33333333-3333-4333-8333-333333333333',
            '44444444-4444-4444-8444-444444444444',
            'PERSONAL_OWNER','ACTIVE');
    RAISE EXCEPTION 'PAY54_TEST_BUSINESS_ROLE_BYPASS';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE pay54.accounts SET account_type='BUSINESS'
    WHERE account_id='11111111-1111-4111-8111-111111111111';
    RAISE EXCEPTION 'PAY54_TEST_ACCOUNT_TYPE_BYPASS';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE pay54.accounts SET legal_owner_id='44444444-4444-4444-8444-444444444444'
    WHERE account_id='11111111-1111-4111-8111-111111111111';
    RAISE EXCEPTION 'PAY54_TEST_LEGAL_OWNER_BYPASS';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END
$$;

SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END) AS no_forged_membership
FROM pay54.account_memberships
WHERE principal_id='44444444-4444-4444-8444-444444444444';
