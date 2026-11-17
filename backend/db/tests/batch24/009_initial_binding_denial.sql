-- PAY54 Batch 24 / 936 — initial bind rejects cross-tenant and replay.
\set ON_ERROR_STOP on
BEGIN;
SET ROLE pay54_session_issue_role;
SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END) AS seed_bootstrap
FROM pay54.consume_identity_assertion_and_issue_bootstrap(
 'https://identity.pay54.example',
 '11111111-1111-4111-8111-111111111111',
 '99999999-9999-4999-8999-999999999999',
 now()+interval '2 minutes',
 'aaaaaaaa-0000-4000-8000-000000000001',
 decode(repeat('71',32),'hex'),decode(repeat('72',32),'hex')
);
RESET ROLE;
SET ROLE pay54_session_rotate_role;
DO $$
DECLARE ix int;err text;
BEGIN
 FOR ix IN 1..6 LOOP
  BEGIN
   PERFORM * FROM pay54.bind_initial_account_session(
    decode(repeat('71',32),'hex'),
    CASE WHEN ix=1 THEN decode(repeat('99',32),'hex')
         ELSE decode(repeat('72',32),'hex') END,
    'aaaaaaaa-0000-4000-8000-000000000002',
    CASE WHEN ix=5 THEN decode(repeat('71',32),'hex')
         ELSE decode(repeat('73',32),'hex') END,
    decode(repeat('74',32),'hex'),
    CASE WHEN ix=2 THEN '22222222-2222-4222-8222-222222222222'::uuid
         ELSE '11111111-1111-4111-8111-111111111111'::uuid END,
    CASE WHEN ix=3 THEN 99 ELSE 1 END,
    '77777777-7777-4777-8777-777777777777',
    '66666666-6666-4666-8666-666666666666',
    CASE WHEN ix=4 THEN now()+interval '1 day'
         WHEN ix=6 THEN now()-interval '1 second'
         ELSE now()+interval '60 seconds' END
   );
   RAISE EXCEPTION 'PAY54_INVALID_INITIAL_BINDING_ACCEPTED_%',ix;
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
   GET STACKED DIAGNOSTICS err=MESSAGE_TEXT;
   IF err<>'PAY54_INITIAL_ACCOUNT_BINDING_DENIED' THEN RAISE; END IF;
  END;
 END LOOP;
END $$;
RESET ROLE;
SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END)
 AS failed_initial_bind_preserves_bootstrap_session
FROM pay54.auth_sessions
WHERE session_id='aaaaaaaa-0000-4000-8000-000000000001'
 AND session_status='ACTIVE' AND active_account_id IS NULL;
SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END)
 AS failed_initial_bind_created_no_audit
FROM pay54.account_context_audit
WHERE next_session_id='aaaaaaaa-0000-4000-8000-000000000002';
ROLLBACK;
