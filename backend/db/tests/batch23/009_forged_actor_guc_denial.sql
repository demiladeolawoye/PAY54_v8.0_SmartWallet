-- PAY54 Batch 23 / 898 — forged session actor GUC cannot override DB principal.
\set ON_ERROR_STOP on
BEGIN;
SET ROLE pay54_session_rotate_role;
SELECT set_config('pay54.actor_id','22222222-2222-4222-8222-222222222222',true);
SELECT set_config('pay54.session_digest',repeat('ab',32),true);
DO $$
DECLARE received text;
BEGIN
  BEGIN
    PERFORM * FROM pay54.rotate_account_context_session(
      decode(repeat('ab',32),'hex'),
      decode(repeat('cd',32),'hex'),
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      decode(repeat('ef',32),'hex'),
      decode(repeat('12',32),'hex'),
      '22222222-2222-4222-8222-222222222222',
      1,'77777777-7777-4777-8777-777777777777',
      '66666666-6666-4666-8666-666666666666',
      now()+interval '30 minutes'
    );
    RAISE EXCEPTION 'PAY54_FORGED_ACTOR_GUC_ACCEPTED';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    GET STACKED DIAGNOSTICS received=MESSAGE_TEXT;
    IF received<>'PAY54_SESSION_ROTATION_DENIED' THEN RAISE; END IF;
  END;
END $$;
RESET ROLE;
SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END)
 AS externally_supplied_actor_cannot_revoke_session
FROM pay54.auth_sessions
WHERE session_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
 AND session_status='ACTIVE';
ROLLBACK;
