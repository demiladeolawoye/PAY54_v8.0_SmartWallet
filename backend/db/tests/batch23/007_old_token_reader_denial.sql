-- PAY54 Batch 23 / 881 — credential reader sees new but not revoked old.
-- Run before concurrency test, fully rolled back.
\set ON_ERROR_STOP on
BEGIN;
SET ROLE pay54_session_rotate_role;
SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END)
 AS authorised_rotation_for_credential_test
FROM pay54.rotate_account_context_session(
 decode(repeat('ab',32),'hex'),
 decode(repeat('cd',32),'hex'),
 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
 decode(repeat('ef',32),'hex'),
 decode(repeat('12',32),'hex'),
 '33333333-3333-4333-8333-333333333333',
 1,'77777777-7777-4777-8777-777777777777',
 '66666666-6666-4666-8666-666666666666',
 now()+interval '30 minutes'
);
RESET ROLE;
SET ROLE pay54_session_read_role;
SELECT set_config('pay54.session_digest',repeat('ab',32),true);
SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END)
 AS revoked_original_not_readable
FROM pay54.auth_sessions;
SELECT set_config('pay54.session_digest',repeat('ef',32),true);
SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END)
 AS replacement_readable_by_digest_only
FROM pay54.auth_sessions
WHERE session_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  AND session_status='ACTIVE';
RESET ROLE;
ROLLBACK;
