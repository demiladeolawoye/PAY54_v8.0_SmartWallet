-- PAY54 Batch 23 / 899 — defensive input bounds never mutate sessions.
\set ON_ERROR_STOP on
BEGIN;
SET ROLE pay54_session_rotate_role;
DO $$
DECLARE ix integer; message text;
BEGIN
  FOR ix IN 1..5 LOOP
    BEGIN
      PERFORM * FROM pay54.rotate_account_context_session(
        decode(repeat('ab',32),'hex'),
        decode(repeat('cd',32),'hex'),
        CASE WHEN ix=1 THEN 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
             ELSE 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid END,
        CASE WHEN ix=2 THEN decode(repeat('ab',32),'hex')
             ELSE decode(repeat('ef',32),'hex') END,
        CASE WHEN ix=3 THEN decode(repeat('cd',32),'hex')
             ELSE decode(repeat('12',32),'hex') END,
        '33333333-3333-4333-8333-333333333333'::uuid,
        CASE WHEN ix=4 THEN 9223372036854775807 ELSE 1 END,
        '77777777-7777-4777-8777-777777777777'::uuid,
        CASE WHEN ix=5 THEN NULL::uuid
             ELSE '66666666-6666-4666-8666-666666666666'::uuid END,
        now()+interval '30 minutes'
      );
      RAISE EXCEPTION 'PAY54_INVALID_ROTATION_CASE_WAS_ACCEPTED_%',ix;
    EXCEPTION WHEN SQLSTATE 'P0001' THEN
      GET STACKED DIAGNOSTICS message=MESSAGE_TEXT;
      IF message<>'PAY54_SESSION_ROTATION_DENIED' THEN RAISE; END IF;
    END;
  END LOOP;
END $$;
RESET ROLE;
SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END)
 AS invalid_inputs_cannot_revoke_current_session
FROM pay54.auth_sessions
WHERE session_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  AND session_status='ACTIVE' AND session_version=1;
ROLLBACK;
