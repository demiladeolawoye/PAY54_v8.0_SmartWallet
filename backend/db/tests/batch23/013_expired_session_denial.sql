-- PAY54 Batch 23 / 902 — expired_session denies rotation without side effects.
\set ON_ERROR_STOP on
BEGIN;
UPDATE pay54.auth_sessions SET expires_at=now()-interval '1 minute' WHERE session_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SET ROLE pay54_session_rotate_role;
DO $$
DECLARE msg text;
BEGIN
  BEGIN
    PERFORM * FROM pay54.rotate_account_context_session(
      decode(repeat('ab',32),'hex'),decode(repeat('cd',32),'hex'),
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      decode(repeat('ef',32),'hex'),decode(repeat('12',32),'hex'),
      '33333333-3333-4333-8333-333333333333',
      1,'77777777-7777-4777-8777-777777777777',
      '66666666-6666-4666-8666-666666666666',
      now()+interval '30 minutes'
    );
    RAISE EXCEPTION 'PAY54_INVALID_EXPIRED_SESSION_ACCEPTED';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    GET STACKED DIAGNOSTICS msg=MESSAGE_TEXT;
    IF msg<>'PAY54_SESSION_ROTATION_DENIED' THEN RAISE; END IF;
  END;
END $$;
RESET ROLE;
SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END)
 AS expired_session_cannot_revoke_or_rotate
FROM pay54.auth_sessions WHERE
 session_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
 AND session_status='ACTIVE';
SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END)
 AS expired_session_cannot_create_audit
FROM pay54.account_context_audit
WHERE next_session_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
ROLLBACK;
