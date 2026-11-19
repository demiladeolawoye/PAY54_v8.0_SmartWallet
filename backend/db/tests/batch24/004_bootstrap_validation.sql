-- PAY54 Batch 24 / 929: invalid short-lived assertion and secret digests.
\set ON_ERROR_STOP on
BEGIN;
DO $$
DECLARE ix int; msg text;
BEGIN
 FOR ix IN 1..6 LOOP
  BEGIN
   PERFORM * FROM pay54.consume_identity_assertion_and_issue_bootstrap(
    CASE WHEN ix=1 THEN 'http://untrusted.example'
         ELSE 'https://identity.pay54.example' END,
    '11111111-1111-4111-8111-111111111111',
    '99999999-9999-4999-8999-999999999999',
    CASE WHEN ix=2 THEN now()-interval '1 second'
         WHEN ix=3 THEN now()+interval '20 minutes'
         ELSE now()+interval '2 minutes' END,
    'aaaaaaaa-0000-4000-8000-000000000001',
    CASE WHEN ix=4 THEN decode('abcd','hex')
         WHEN ix=5 THEN decode(repeat('72',32),'hex')
         ELSE decode(repeat('71',32),'hex') END,
    CASE WHEN ix=5 THEN decode(repeat('72',32),'hex')
         WHEN ix=6 THEN NULL::bytea
         ELSE decode(repeat('72',32),'hex') END
   );
   RAISE EXCEPTION 'PAY54_INVALID_ASSERTION_ACCEPTED_%',ix;
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
   GET STACKED DIAGNOSTICS msg=MESSAGE_TEXT;
   IF msg<>'PAY54_BOOTSTRAP_ISSUANCE_DENIED' THEN RAISE; END IF;
  END;
 END LOOP;
END $$;
SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END) AS no_post_commit_fixture
FROM pay54.auth_sessions
WHERE session_id='aaaaaaaa-0000-4000-8000-000000000002';
ROLLBACK;
