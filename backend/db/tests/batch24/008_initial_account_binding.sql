-- PAY54 Batch 24 / 935 — verified bootstrap → initial Personal account.
\set ON_ERROR_STOP on
BEGIN;
SET ROLE pay54_session_issue_role;
SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END) AS initial_bootstrap_issued
FROM pay54.consume_identity_assertion_and_issue_bootstrap(
 'https://identity.pay54.example',
 '11111111-1111-4111-8111-111111111111',
 '99999999-9999-4999-8999-999999999999',
 now()+interval '2 minutes',
 'aaaaaaaa-0000-4000-8000-000000000001',
 decode(repeat('71',32),'hex'),
 decode(repeat('72',32),'hex')
);
RESET ROLE;

SET ROLE pay54_session_rotate_role;
SELECT 1/(CASE WHEN count(*)=1
 AND max(bound_session_version)=2 THEN 1 ELSE 0 END)
 AS initial_account_binding_succeeded
FROM pay54.bind_initial_account_session(
 decode(repeat('71',32),'hex'),
 decode(repeat('72',32),'hex'),
 'aaaaaaaa-0000-4000-8000-000000000002',
 decode(repeat('73',32),'hex'),
 decode(repeat('74',32),'hex'),
 '11111111-1111-4111-8111-111111111111',
 1,
 '77777777-7777-4777-8777-777777777777',
 '66666666-6666-4666-8666-666666666666',
 now()+interval '60 seconds'
);
RESET ROLE;

SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END)
 AS unbound_bootstrap_revoked
FROM pay54.auth_sessions
WHERE session_id='aaaaaaaa-0000-4000-8000-000000000001'
 AND active_account_id IS NULL
 AND session_status='REVOKED' AND revoked_at IS NOT NULL;

SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END)
 AS new_session_bound_to_authorised_personal
FROM pay54.auth_sessions
WHERE session_id='aaaaaaaa-0000-4000-8000-000000000002'
 AND active_account_id='11111111-1111-4111-8111-111111111111'
 AND principal_id='11111111-1111-4111-8111-111111111111'
 AND session_version=2 AND session_status='ACTIVE';

SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END)
 AS initial_binding_audit_preserves_null_previous_account
FROM pay54.account_context_audit
WHERE audit_id='66666666-6666-4666-8666-666666666666'
 AND previous_account_id IS NULL
 AND next_account_id='11111111-1111-4111-8111-111111111111'
 AND expected_previous_version=1 AND next_session_version=2;

ROLLBACK;
SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END)
 AS disposable_initial_binding_fully_rolled_back
FROM pay54.auth_sessions
WHERE session_id='aaaaaaaa-0000-4000-8000-000000000002';
