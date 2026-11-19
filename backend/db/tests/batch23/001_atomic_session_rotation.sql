-- PAY54 Batch 23 / 869 — atomic, authorised Personal -> Business rebind.
-- Disposable database only. Requires canonical migrations 001–018 and
-- Batch 22's isolated 001_rls_tenant_isolation.sql synthetic fixtures.
\set ON_ERROR_STOP on
BEGIN;
SET ROLE pay54_session_rotate_role;
SELECT 1/(CASE WHEN count(*)=1
  AND max(rotated_session_version)=2 THEN 1 ELSE 0 END)
  AS session_rotated_once
FROM pay54.rotate_account_context_session(
  decode(repeat('ab',32),'hex'),
  decode(repeat('cd',32),'hex'),
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  decode(repeat('ef',32),'hex'),
  decode(repeat('12',32),'hex'),
  '33333333-3333-4333-8333-333333333333',
  1,
  '77777777-7777-4777-8777-777777777777',
  '66666666-6666-4666-8666-666666666666',
  now() + interval '30 minutes'
);
RESET ROLE;

SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END)
  AS old_session_revoked
FROM pay54.auth_sessions
WHERE session_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  AND session_status='REVOKED' AND revoked_at IS NOT NULL;

SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END)
  AS new_session_bound_to_business
FROM pay54.auth_sessions
WHERE session_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  AND principal_id='11111111-1111-4111-8111-111111111111'
  AND active_account_id='33333333-3333-4333-8333-333333333333'
  AND session_status='ACTIVE' AND session_version=2;

SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END)
 AS audit_inserted_atomically
FROM pay54.account_context_audit
WHERE audit_id='66666666-6666-4666-8666-666666666666'
  AND previous_session_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  AND next_session_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  AND previous_account_id='11111111-1111-4111-8111-111111111111'
  AND next_account_id='33333333-3333-4333-8333-333333333333';

-- All changes are test-only. Preserve Batch 22 seed for later tests.
ROLLBACK;

SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END)
  AS rollback_kept_original_session_active
FROM pay54.auth_sessions
WHERE session_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  AND session_status='ACTIVE' AND session_version=1;
