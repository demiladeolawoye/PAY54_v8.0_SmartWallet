-- PAY54 Batch 23 / 870 — stale/replayed/wrong-account rotations fail closed.
-- All tests are inside one disposable transaction and leave no customer data.
\set ON_ERROR_STOP on
BEGIN;
SET ROLE pay54_session_rotate_role;
DO $$
DECLARE
  case_num integer;
  message text;
BEGIN
  FOR case_num IN 1..7 LOOP
    BEGIN
      PERFORM * FROM pay54.rotate_account_context_session(
        CASE WHEN case_num=1 THEN decode(repeat('ff',32),'hex')
             ELSE decode(repeat('ab',32),'hex') END,
        CASE WHEN case_num=2 THEN decode(repeat('ee',32),'hex')
             ELSE decode(repeat('cd',32),'hex') END,
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        decode(repeat('ef',32),'hex'),
        decode(repeat('12',32),'hex'),
        CASE
          WHEN case_num=3 THEN '22222222-2222-4222-8222-222222222222'::uuid
          WHEN case_num=4 THEN '11111111-1111-4111-8111-111111111111'::uuid
          ELSE '33333333-3333-4333-8333-333333333333'::uuid
        END,
        CASE WHEN case_num=5 THEN 999 ELSE 1 END,
        '77777777-7777-4777-8777-777777777777',
        '66666666-6666-4666-8666-666666666666',
        CASE WHEN case_num=6 THEN now() - interval '1 minute'
             WHEN case_num=7 THEN now() + interval '24 hours'
             ELSE now() + interval '30 minutes' END
      );
      RAISE EXCEPTION 'PAY54_TEST_INVALID_ROTATION_SUCCEEDED_%', case_num;
    EXCEPTION WHEN SQLSTATE 'P0001' THEN
      GET STACKED DIAGNOSTICS message=MESSAGE_TEXT;
      IF message <> 'PAY54_SESSION_ROTATION_DENIED' THEN RAISE; END IF;
    END;
  END LOOP;
END $$;
RESET ROLE;

SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END)
 AS denied_attempts_preserved_live_session
FROM pay54.auth_sessions
WHERE session_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  AND session_status='ACTIVE' AND session_version=1;

SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END)
 AS denied_attempts_created_no_success_audit
FROM pay54.account_context_audit
WHERE next_session_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
ROLLBACK;
