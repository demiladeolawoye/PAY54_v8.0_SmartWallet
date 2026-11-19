-- PAY54 Batch 23 / 879 — unique token collision cannot partially rotate.
\set ON_ERROR_STOP on
BEGIN;
INSERT INTO pay54.auth_sessions(
 session_id,principal_id,token_digest,csrf_digest,active_account_id,
 session_status,session_version,issued_at,expires_at
) VALUES (
 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
 '22222222-2222-4222-8222-222222222222',
 decode(repeat('ef',32),'hex'),
 decode(repeat('56',32),'hex'),
 '22222222-2222-4222-8222-222222222222',
 'ACTIVE',1,now() - interval '1 minute',now() + interval '1 hour'
);
SET ROLE pay54_session_rotate_role;
DO $$
BEGIN
  BEGIN
    PERFORM * FROM pay54.rotate_account_context_session(
      decode(repeat('ab',32),'hex'),decode(repeat('cd',32),'hex'),
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      decode(repeat('ef',32),'hex'),
      decode(repeat('12',32),'hex'),
      '33333333-3333-4333-8333-333333333333',
      1,'77777777-7777-4777-8777-777777777777',
      '66666666-6666-4666-8666-666666666666',
      now()+interval '30 minutes'
    );
    RAISE EXCEPTION 'PAY54_TEST_TOKEN_COLLISION_ACCEPTED';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END $$;
RESET ROLE;
SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END)
  AS duplicate_token_does_not_revoke_original
FROM pay54.auth_sessions WHERE session_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  AND session_status='ACTIVE';
SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END)
  AS duplicate_token_does_not_write_audit
FROM pay54.account_context_audit
WHERE next_session_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
ROLLBACK;
