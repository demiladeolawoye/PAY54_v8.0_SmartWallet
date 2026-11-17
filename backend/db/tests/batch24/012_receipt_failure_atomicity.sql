-- PAY54 Batch 24 / 951 — duplicate session id must roll back assertion receipt.
\set ON_ERROR_STOP on
BEGIN;
SET ROLE pay54_session_issue_role;
DO $$
BEGIN
 BEGIN
  PERFORM * FROM pay54.consume_identity_assertion_and_issue_bootstrap(
   'https://identity.pay54.example',
   '11111111-1111-4111-8111-111111111111',
   '99999999-9999-4999-8999-999999999999',
   now()+interval '2 minutes',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   decode(repeat('71',32),'hex'),
   decode(repeat('72',32),'hex')
  );
  RAISE EXCEPTION 'PAY54_DUPLICATE_SESSION_ID_WAS_ACCEPTED';
 EXCEPTION WHEN unique_violation THEN NULL;
 END;
END $$;
RESET ROLE;
SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END)
 AS failed_session_insert_does_not_consume_assertion
FROM pay54.identity_assertion_receipts
WHERE assertion_id='99999999-9999-4999-8999-999999999999';
ROLLBACK;