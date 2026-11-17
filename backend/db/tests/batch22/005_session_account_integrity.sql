-- PAY54 Batch 22 / 842 — actual PostgreSQL session-active-account guard.
-- Run after seeded account/session fixture, disposable database only.
\set ON_ERROR_STOP on
DO $$
BEGIN
  BEGIN
    UPDATE pay54.auth_sessions
      SET active_account_id='22222222-2222-4222-8222-222222222222'
      WHERE session_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    RAISE EXCEPTION 'PAY54_TEST_UNOWNED_ACCOUNT_ACCEPTED';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE pay54.auth_sessions
      SET principal_id='22222222-2222-4222-8222-222222222222'
      WHERE session_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    RAISE EXCEPTION 'PAY54_TEST_SESSION_IMPERSONATION_ACCEPTED';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END
$$;

BEGIN;
UPDATE pay54.auth_sessions
  SET active_account_id='33333333-3333-4333-8333-333333333333'
  WHERE session_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END) AS authorised_business_selected
  FROM pay54.auth_sessions
  WHERE active_account_id='33333333-3333-4333-8333-333333333333'
    AND principal_id='11111111-1111-4111-8111-111111111111';
ROLLBACK;

SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END) AS original_personal_session_preserved
  FROM pay54.auth_sessions
  WHERE active_account_id='11111111-1111-4111-8111-111111111111'
    AND principal_id='11111111-1111-4111-8111-111111111111';
