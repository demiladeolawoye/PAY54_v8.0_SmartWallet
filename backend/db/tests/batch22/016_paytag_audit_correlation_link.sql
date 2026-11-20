-- PAY54 P2B-B2B3A — audit linkage PostgreSQL integration.
-- The disposable CI fixture from 014 creates a CLAIMED audit record for
-- tag cccccccc-aaaa-4aaa-8aaa-aaaaaaaaaaa1 and a real session from 019.
\set ON_ERROR_STOP on
BEGIN;
DO $assert$
BEGIN
 IF (SELECT count(*) FROM pay54.paytag_registry_audit
     WHERE tag_id='cccccccc-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
       AND event_kind='CLAIMED')<>1
 THEN RAISE EXCEPTION 'PAYTAG_AUDIT_LINK_CLAIM_FIXTURE_MISSING'; END IF;
END
$assert$;

INSERT INTO pay54.paytag_registration_requests (
 request_id,owner_account_id,owner_principal_id,session_id,session_version,
 idempotency_key_digest,request_digest,canonical_alias,correlation_id,request_state
) VALUES (
 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5',
 '11111111-1111-4111-8111-111111111111',
 '11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1,
 decode(repeat('8d',32),'hex'),decode(repeat('9e',32),'hex'),
 'p2b_race_guard',
 (SELECT correlation_id FROM pay54.paytag_registry_audit
  WHERE tag_id='cccccccc-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
    AND event_kind='CLAIMED'),'PENDING'
);

UPDATE pay54.paytag_registration_requests
 SET request_state='COMMITTED',
     registry_tag_id='cccccccc-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
     committed_at=clock_timestamp()
 WHERE request_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5';
SET CONSTRAINTS pay54.paytag_committed_must_match_exact_claim IMMEDIATE;
DO $assert$
BEGIN
 IF NOT EXISTS(
   SELECT 1 FROM pay54.paytag_registration_requests req
   JOIN pay54.paytag_registry_audit audit
     ON req.correlation_id=audit.correlation_id
    AND req.registry_tag_id=audit.tag_id
    AND req.owner_account_id=audit.owner_account_id
    AND req.owner_principal_id=audit.owner_principal_id
   WHERE req.request_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5'
     AND req.request_state='COMMITTED'
     AND audit.event_kind='CLAIMED'
 )
 THEN RAISE EXCEPTION 'PAYTAG_VALID_COMMITTED_CLAIM_MISSING'; END IF;
END
$assert$;

-- Negative: a plausible tag with a fabricated correlation must fail even
-- when the tag exists, the account is valid and the state is COMMITTED.
DO $assert$
DECLARE err text;
BEGIN
 BEGIN
  INSERT INTO pay54.paytag_registration_requests (
   request_id,owner_account_id,owner_principal_id,session_id,session_version,
   idempotency_key_digest,request_digest,canonical_alias,
   correlation_id,request_state)
  VALUES (
   'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee6',
   '11111111-1111-4111-8111-111111111111',
   '11111111-1111-4111-8111-111111111111',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1,
   decode(repeat('ad',32),'hex'),decode(repeat('be',32),'hex'),
   'p2b_race_guard','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','PENDING');
  UPDATE pay54.paytag_registration_requests
   SET request_state='COMMITTED',
       registry_tag_id='cccccccc-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
       committed_at=clock_timestamp()
   WHERE request_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee6';
  SET CONSTRAINTS pay54.paytag_committed_must_match_exact_claim IMMEDIATE;
  RAISE EXCEPTION 'PAYTAG_FORGED_AUDIT_CORRELATION_ACCEPTED';
 EXCEPTION WHEN foreign_key_violation THEN NULL;
 END;
END
$assert$;

-- Separate, legitimate account-2 claim avoids the unique-correlation key of
-- the committed account-1 request, and tests the exact owner/principal FK.
INSERT INTO pay54.paytag_registry
 (tag_id,canonical_alias,owner_account_id,wallet_id,owner_principal_id,registry_state)
VALUES
 ('dddddddd-aaaa-4aaa-8aaa-aaaaaaaaaaa2','p2b_audit_principal',
  '22222222-2222-4222-8222-222222222222',
  'dddddddd-2222-4222-8222-222222222222',
  '22222222-2222-4222-8222-222222222222','RESERVED');

-- Negative: a correct audit event must not be claimable with a different
-- principal, even if the account, session, tag and correlation are correct.
DO $assert$
DECLARE err text;
BEGIN
 BEGIN
  INSERT INTO pay54.paytag_registration_requests (
   request_id,owner_account_id,owner_principal_id,session_id,session_version,
   idempotency_key_digest,request_digest,canonical_alias,
   correlation_id,request_state)
  VALUES (
   'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee7',
   '22222222-2222-4222-8222-222222222222',
   '11111111-1111-4111-8111-111111111111',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1,
   decode(repeat('cd',32),'hex'),decode(repeat('de',32),'hex'),
   'p2b_audit_principal',
   (SELECT correlation_id FROM pay54.paytag_registry_audit
    WHERE tag_id='dddddddd-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
      AND event_kind='CLAIMED'),'PENDING');
  UPDATE pay54.paytag_registration_requests
   SET request_state='COMMITTED',
       registry_tag_id='dddddddd-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
       committed_at=clock_timestamp()
   WHERE request_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee7';
  SET CONSTRAINTS pay54.paytag_committed_must_match_exact_claim IMMEDIATE;
  RAISE EXCEPTION 'PAYTAG_FOREIGN_PRINCIPAL_AUDIT_ACCEPTED';
 EXCEPTION WHEN foreign_key_violation THEN NULL;
 END;
END
$assert$;
DO $assert$
BEGIN
 IF (SELECT count(*) FROM pay54.paytag_registration_requests
     WHERE request_id IN ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5',
                          'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee6',
                          'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee7'))<>1
 THEN RAISE EXCEPTION 'PAYTAG_NEGATIVE_AUDIT_ATTEMPTS_PERSISTED'; END IF;
END
$assert$;
ROLLBACK;
