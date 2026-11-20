-- PAY54 PayTag B2A negative idempotency tests, disposable CI only.
\set ON_ERROR_STOP on
BEGIN;

INSERT INTO pay54.paytag_registration_requests (
 request_id,owner_account_id,owner_principal_id,session_id,session_version,
 idempotency_key_digest,request_digest,canonical_alias,correlation_id,request_state
) VALUES (
 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
 '11111111-1111-4111-8111-111111111111',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1,
 decode(repeat('5a',32),'hex'),decode(repeat('6b',32),'hex'),
 'p2b_race_guard','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2','PENDING'
);
DO $assert$
DECLARE v text;
BEGIN
  BEGIN
    INSERT INTO pay54.paytag_registration_requests (
      request_id,owner_account_id,owner_principal_id,session_id,session_version,
      idempotency_key_digest,request_digest,canonical_alias,correlation_id,request_state
    ) VALUES (
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3',
      '11111111-1111-4111-8111-111111111111',
      '11111111-1111-4111-8111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1,
      decode(repeat('5a',32),'hex'),decode(repeat('7c',32),'hex'),
      'different_tag','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4','PENDING'
    );
    RAISE EXCEPTION 'PAYTAG_SAME_KEY_CONFLICT_NOT_DENIED';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  BEGIN
    UPDATE pay54.paytag_registration_requests SET canonical_alias='changed_tag'
      WHERE request_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1';
    RAISE EXCEPTION 'PAYTAG_IDEMPOTENCY_SCOPE_MUTATION_ACCEPTED';
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS v = MESSAGE_TEXT;
    IF v <> 'PAY54_PAYTAG_IDEMPOTENCY_IMMUTABLE' THEN RAISE; END IF;
  END;
END
$assert$;

UPDATE pay54.paytag_registration_requests
 SET request_state='COMMITTED',
     registry_tag_id='cccccccc-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
     committed_at=clock_timestamp()
 WHERE request_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1';

DO $assert$
DECLARE v text;
BEGIN
 IF (SELECT count(*) FROM pay54.paytag_registration_requests
    WHERE request_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'
      AND request_state='COMMITTED'
      AND registry_tag_id='cccccccc-aaaa-4aaa-8aaa-aaaaaaaaaaa1')<>1
 THEN RAISE EXCEPTION 'PAYTAG_IDEMPOTENCY_RESULT_MISSING'; END IF;
 BEGIN
   UPDATE pay54.paytag_registration_requests SET request_digest=decode(repeat('7c',32),'hex')
    WHERE request_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1';
   RAISE EXCEPTION 'PAYTAG_REPLAY_MUTATION_ACCEPTED';
 EXCEPTION WHEN raise_exception THEN
   GET STACKED DIAGNOSTICS v = MESSAGE_TEXT;
   IF v <> 'PAY54_PAYTAG_IDEMPOTENCY_IMMUTABLE' THEN RAISE; END IF;
 END;
 BEGIN
   DELETE FROM pay54.paytag_registration_requests
     WHERE request_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1';
   RAISE EXCEPTION 'PAYTAG_IDEMPOTENCY_DELETE_ACCEPTED';
 EXCEPTION WHEN raise_exception THEN
   GET STACKED DIAGNOSTICS v = MESSAGE_TEXT;
   IF v <> 'PAY54_PAYTAG_IDEMPOTENCY_IMMUTABLE' THEN RAISE; END IF;
 END;
END
$assert$;
ROLLBACK;
