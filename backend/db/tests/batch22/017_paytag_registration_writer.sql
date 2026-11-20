-- PAY54 P2B-B2B3B SQL writer integration (privileged disposable DB only).
-- Requires migration 025 and the persisted account/wallet fixtures from 014.
\set ON_ERROR_STOP on
BEGIN;
DO $assert$
BEGIN
 IF has_function_privilege('pay54_financial_app_role',
  'pay54.register_paytag_trusted(bytea,bytea,uuid,bigint,uuid,uuid,text,bytea,bytea,uuid,uuid)',
  'EXECUTE') OR
  has_function_privilege('pay54_ledger_executor_role',
  'pay54.register_paytag_trusted(bytea,bytea,uuid,bigint,uuid,uuid,text,bytea,bytea,uuid,uuid)',
  'EXECUTE')
 THEN RAISE EXCEPTION 'PAYTAG_SQL_WRITER_RUNTIME_PERMISSION_LEAK'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc
  WHERE oid='pay54.register_paytag_trusted(bytea,bytea,uuid,bigint,uuid,uuid,text,bytea,bytea,uuid,uuid)'::regprocedure
   AND prosecdef=FALSE)
 THEN RAISE EXCEPTION 'PAYTAG_WRITER_MUST_BE_INVOKER'; END IF;
END
$assert$;

-- Account 2 is a verified Personal account with one active bound wallet
-- and no existing tag; fixture is created by 014.
INSERT INTO pay54.auth_sessions
 (session_id,principal_id,token_digest,csrf_digest,active_account_id,
  session_status,session_version,issued_at,expires_at)
VALUES
 ('eeeeeeee-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  decode(repeat('e1',32),'hex'),decode(repeat('e2',32),'hex'),
  '22222222-2222-4222-8222-222222222222',
  'ACTIVE',1,clock_timestamp()-interval '10 seconds',
  clock_timestamp()+interval '1 hour');

CREATE TEMP TABLE paytag_writer_result(tag_id uuid,request_id uuid,replayed boolean)
ON COMMIT DROP;

INSERT INTO paytag_writer_result
SELECT * FROM pay54.register_paytag_trusted(
 decode(repeat('e1',32),'hex'),decode(repeat('e2',32),'hex'),
 'eeeeeeee-1111-4111-8111-111111111111',1,
 '22222222-2222-4222-8222-222222222222',
 '22222222-2222-4222-8222-222222222222',
 'paytag_writer_test',
 decode(repeat('e3',32),'hex'),decode(repeat('e4',32),'hex'),
 'eeeeeeee-2222-4222-8222-222222222222',
 'eeeeeeee-3333-4333-8333-333333333333');

INSERT INTO paytag_writer_result
SELECT * FROM pay54.register_paytag_trusted(
 decode(repeat('e1',32),'hex'),decode(repeat('e2',32),'hex'),
 'eeeeeeee-1111-4111-8111-111111111111',1,
 '22222222-2222-4222-8222-222222222222',
 '22222222-2222-4222-8222-222222222222',
 'paytag_writer_test',
 decode(repeat('e3',32),'hex'),decode(repeat('e4',32),'hex'),
 'eeeeeeee-4444-4444-8444-444444444444',
 'eeeeeeee-5555-4555-8555-555555555555');

DO $assert$
DECLARE v boolean;
BEGIN
 IF (SELECT count(*) FROM paytag_writer_result)<>2 OR
    (SELECT count(DISTINCT tag_id) FROM paytag_writer_result)<>1 OR
    (SELECT count(DISTINCT request_id) FROM paytag_writer_result)<>1 OR
    (SELECT count(*) FROM paytag_writer_result WHERE replayed)<>1 OR
    (SELECT count(*) FROM pay54.paytag_registry
      WHERE canonical_alias='paytag_writer_test'
        AND owner_account_id='22222222-2222-4222-8222-222222222222')<>1 OR
    (SELECT count(*) FROM pay54.paytag_registry_audit a
      JOIN pay54.paytag_registration_requests i
        ON i.correlation_id=a.correlation_id
       AND i.registry_tag_id=a.tag_id
       AND i.owner_account_id=a.owner_account_id
       AND i.owner_principal_id=a.owner_principal_id
      WHERE i.canonical_alias='paytag_writer_test'
        AND i.request_state='COMMITTED'
        AND a.event_kind='CLAIMED')<>1
 THEN RAISE EXCEPTION 'PAYTAG_WRITER_ATOMIC_IDEMPOTENCY_AUDIT_FAILURE'; END IF;
END
$assert$;

DO $assert$
DECLARE marker text;
BEGIN
 -- Same key, different request digest must fail without claiming anything.
 BEGIN
  PERFORM * FROM pay54.register_paytag_trusted(
   decode(repeat('e1',32),'hex'),decode(repeat('e2',32),'hex'),
   'eeeeeeee-1111-4111-8111-111111111111',1,
   '22222222-2222-4222-8222-222222222222',
   '22222222-2222-4222-8222-222222222222',
   'paytag_writer_test',
   decode(repeat('e3',32),'hex'),decode(repeat('f4',32),'hex'),
   'eeeeeeee-6666-4666-8666-666666666666',
   'eeeeeeee-7777-4777-8777-777777777777');
  RAISE EXCEPTION 'WRITER_BAD_REPLAY_ALLOWED';
 EXCEPTION WHEN raise_exception THEN
  GET STACKED DIAGNOSTICS marker=MESSAGE_TEXT;
  IF marker<>'PAY54_PAYTAG_IDEMPOTENCY_REPLAY_DENIED' THEN RAISE; END IF;
 END;
 -- Incorrect CSRF is never allowed to replay an already committed response.
 BEGIN
  PERFORM * FROM pay54.register_paytag_trusted(
   decode(repeat('e1',32),'hex'),decode(repeat('ff',32),'hex'),
   'eeeeeeee-1111-4111-8111-111111111111',1,
   '22222222-2222-4222-8222-222222222222',
   '22222222-2222-4222-8222-222222222222',
   'paytag_writer_test',
   decode(repeat('e3',32),'hex'),decode(repeat('e4',32),'hex'),
   'eeeeeeee-8888-4888-8888-888888888888',
   'eeeeeeee-9999-4999-8999-999999999999');
  RAISE EXCEPTION 'WRITER_WRONG_CSRF_ALLOWED';
 EXCEPTION WHEN raise_exception THEN
  GET STACKED DIAGNOSTICS marker=MESSAGE_TEXT;
  IF marker<>'PAY54_PAYTAG_REGISTRATION_DENIED' THEN RAISE; END IF;
 END;
 -- Different key cannot silently register a second tag for same account.
 BEGIN
  PERFORM * FROM pay54.register_paytag_trusted(
   decode(repeat('e1',32),'hex'),decode(repeat('e2',32),'hex'),
   'eeeeeeee-1111-4111-8111-111111111111',1,
   '22222222-2222-4222-8222-222222222222',
   '22222222-2222-4222-8222-222222222222',
   'paytag_writer_two',
   decode(repeat('f3',32),'hex'),decode(repeat('f4',32),'hex'),
   'eeeeeeee-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'eeeeeeee-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  RAISE EXCEPTION 'WRITER_SECOND_TAG_ALLOWED';
 EXCEPTION WHEN raise_exception THEN
  GET STACKED DIAGNOSTICS marker=MESSAGE_TEXT;
  IF marker<>'PAY54_PAYTAG_ALREADY_REGISTERED' THEN RAISE; END IF;
 END;
END
$assert$;

-- A stale session version must be rejected before any replay or write.
DO $assert$
DECLARE marker text;
BEGIN
 BEGIN
  PERFORM * FROM pay54.register_paytag_trusted(
   decode(repeat('e1',32),'hex'),decode(repeat('e2',32),'hex'),
   'eeeeeeee-1111-4111-8111-111111111111',2,
   '22222222-2222-4222-8222-222222222222',
   '22222222-2222-4222-8222-222222222222',
   'paytag_writer_test',decode(repeat('e3',32),'hex'),
   decode(repeat('e4',32),'hex'),
   'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
   'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2');
  RAISE EXCEPTION 'WRITER_STALE_SESSION_VERSION_ALLOWED';
 EXCEPTION WHEN raise_exception THEN
  GET STACKED DIAGNOSTICS marker=MESSAGE_TEXT;
  IF marker<>'PAY54_PAYTAG_REGISTRATION_DENIED' THEN RAISE; END IF;
 END;
END
$assert$;

-- Session rotation invalidates replay even if the same idempotency key is used.
UPDATE pay54.auth_sessions SET session_status='REVOKED',revoked_at=clock_timestamp()
WHERE session_id='eeeeeeee-1111-4111-8111-111111111111';
DO $assert$
DECLARE marker text;
BEGIN
 BEGIN
  PERFORM * FROM pay54.register_paytag_trusted(
   decode(repeat('e1',32),'hex'),decode(repeat('e2',32),'hex'),
   'eeeeeeee-1111-4111-8111-111111111111',1,
   '22222222-2222-4222-8222-222222222222',
   '22222222-2222-4222-8222-222222222222',
   'paytag_writer_test',decode(repeat('e3',32),'hex'),
   decode(repeat('e4',32),'hex'),
   'eeeeeeee-cccc-4ccc-8ccc-cccccccccccc',
   'eeeeeeee-dddd-4ddd-8ddd-dddddddddddd');
  RAISE EXCEPTION 'WRITER_REVOKED_REPLAY_ALLOWED';
 EXCEPTION WHEN raise_exception THEN
  GET STACKED DIAGNOSTICS marker=MESSAGE_TEXT;
  IF marker<>'PAY54_PAYTAG_REGISTRATION_DENIED' THEN RAISE; END IF;
 END;
END
$assert$;
ROLLBACK;
