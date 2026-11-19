-- PAY54 Batch 24 / 932: function-only issuer cannot directly write receipts or auth sessions.
\set ON_ERROR_STOP on
BEGIN;
SET ROLE pay54_session_issue_role;
DO $$
BEGIN
 BEGIN
  INSERT INTO pay54.identity_assertion_receipts(
   issuer,assertion_id,principal_id,bootstrap_session_id,
   assertion_expires_at
  ) VALUES (
   'https://identity.pay54.example',
   '99999999-9999-4999-8999-999999999999',
   '11111111-1111-4111-8111-111111111111',
   'aaaaaaaa-0000-4000-8000-000000000001',
   now()+interval '1 minute');
  RAISE EXCEPTION 'PAY54_DIRECT_JTI_INSERT_ACCEPTED';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  PERFORM count(*) FROM pay54.auth_sessions;
  RAISE EXCEPTION 'PAY54_ISSUER_UNAUTHORISED_SESSION_READ';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
RESET ROLE;
SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END) AS no_post_commit_fixture
FROM pay54.auth_sessions
WHERE session_id='aaaaaaaa-0000-4000-8000-000000000002';
ROLLBACK;
