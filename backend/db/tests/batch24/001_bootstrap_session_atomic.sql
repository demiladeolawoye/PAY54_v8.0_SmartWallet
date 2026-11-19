-- PAY54 Batch 24 / 923: signed-claim consumption contract, disposable only.
-- This SQL test uses synthetic, preverified claim values; no real IdP.
\set ON_ERROR_STOP on
BEGIN;
SET ROLE pay54_session_issue_role;
SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END) AS issued_once
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

SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END)
 AS exact_one_session_and_no_active_account
FROM pay54.auth_sessions
WHERE session_id='aaaaaaaa-0000-4000-8000-000000000001'
 AND principal_id='11111111-1111-4111-8111-111111111111'
 AND active_account_id IS NULL AND session_version=1
 AND session_status='ACTIVE'
 AND expires_at <= now()+interval '5 minutes';

SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END)
 AS one_assertion_receipt_corresponds_to_new_session
FROM pay54.identity_assertion_receipts
WHERE issuer='https://identity.pay54.example'
 AND assertion_id='99999999-9999-4999-8999-999999999999'
 AND bootstrap_session_id='aaaaaaaa-0000-4000-8000-000000000001';
ROLLBACK;

SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END)
 AS test_rollback_has_no_bootstrap_session
FROM pay54.auth_sessions
WHERE session_id='aaaaaaaa-0000-4000-8000-000000000001';
