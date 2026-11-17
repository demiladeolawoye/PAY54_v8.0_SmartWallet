-- PAY54 Batch 24 / 931: session reader can see account-unbound bootstrap only via digest.
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
SET ROLE pay54_session_read_role;
SELECT set_config('pay54.session_digest',repeat('71',32),true);
SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END) AS newly_issued_auth_scope
FROM pay54.auth_sessions
WHERE session_id='aaaaaaaa-0000-4000-8000-000000000001'
 AND active_account_id IS NULL AND session_version=1;
SELECT set_config('pay54.session_digest',repeat('ff',32),true);
SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END) AS unknown_digest_no_access
FROM pay54.auth_sessions;
RESET ROLE;
SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END) AS no_post_commit_fixture
FROM pay54.auth_sessions
WHERE session_id='aaaaaaaa-0000-4000-8000-000000000002';
ROLLBACK;
