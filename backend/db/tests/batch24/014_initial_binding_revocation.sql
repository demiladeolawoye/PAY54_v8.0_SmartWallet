-- PAY54 Batch 24 / 953 — revoked Personal membership cannot be first-bound.
\set ON_ERROR_STOP on
BEGIN;
SET ROLE pay54_session_issue_role;
SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END) AS issued
FROM pay54.consume_identity_assertion_and_issue_bootstrap(
 'https://identity.pay54.example',
 '11111111-1111-4111-8111-111111111111',
 '99999999-9999-4999-8999-999999999999',
 now()+interval '2 minutes',
 'aaaaaaaa-0000-4000-8000-000000000001',
 decode(repeat('71',32),'hex'),
 decode(repeat('72',32),'hex'));
RESET ROLE;
UPDATE pay54.account_memberships SET status='REVOKED'
WHERE account_id='11111111-1111-4111-8111-111111111111'
 AND principal_subject='11111111-1111-4111-8111-111111111111';
SET ROLE pay54_session_rotate_role;
DO $$
DECLARE msg text;
BEGIN
 BEGIN
  PERFORM * FROM pay54.bind_initial_account_session(
   decode(repeat('71',32),'hex'),
   decode(repeat('72',32),'hex'),
   'aaaaaaaa-0000-4000-8000-000000000002',
   decode(repeat('73',32),'hex'),
   decode(repeat('74',32),'hex'),
   '11111111-1111-4111-8111-111111111111',
   1,'77777777-7777-4777-8777-777777777777',
   '66666666-6666-4666-8666-666666666666',
   now()+interval '60 seconds'
  );
  RAISE EXCEPTION 'PAY54_REVOKED_PERSONAL_MEMBER_ACCEPTED';
 EXCEPTION WHEN SQLSTATE 'P0001' THEN
  GET STACKED DIAGNOSTICS msg=MESSAGE_TEXT;
  IF msg<>'PAY54_INITIAL_ACCOUNT_BINDING_DENIED' THEN RAISE; END IF;
 END;
END $$;
RESET ROLE;
SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END)
 AS revoked_member_cannot_revoke_bootstrap
FROM pay54.auth_sessions
WHERE session_id='aaaaaaaa-0000-4000-8000-000000000001'
 AND session_status='ACTIVE';
ROLLBACK;