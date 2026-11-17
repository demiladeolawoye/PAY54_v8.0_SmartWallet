-- PAY54 Batch 24 / 930: duplicate consumed JTI even when caller changes asserted principal.
\set ON_ERROR_STOP on
BEGIN;
SET ROLE pay54_session_issue_role;
SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END) AS first_issued
FROM pay54.consume_identity_assertion_and_issue_bootstrap(
 'https://identity.pay54.example',
 '11111111-1111-4111-8111-111111111111',
 '99999999-9999-4999-8999-999999999999',
 now()+interval '2 minutes',
 'aaaaaaaa-0000-4000-8000-000000000001',
 decode(repeat('71',32),'hex'),
 decode(repeat('72',32),'hex'));
DO $$
BEGIN
 BEGIN
  PERFORM * FROM pay54.consume_identity_assertion_and_issue_bootstrap(
   'https://identity.pay54.example',
   '22222222-2222-4222-8222-222222222222',
   '99999999-9999-4999-8999-999999999999',
   now()+interval '2 minutes',
   'aaaaaaaa-0000-4000-8000-000000000002',
   decode(repeat('73',32),'hex'),
   decode(repeat('74',32),'hex')
  );
  RAISE EXCEPTION 'PAY54_CROSS_PRINCIPAL_REPLAY_ACCEPTED';
 EXCEPTION WHEN unique_violation THEN NULL;
 END;
END $$;
RESET ROLE;
SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END) AS no_post_commit_fixture
FROM pay54.auth_sessions
WHERE session_id='aaaaaaaa-0000-4000-8000-000000000002';
ROLLBACK;
