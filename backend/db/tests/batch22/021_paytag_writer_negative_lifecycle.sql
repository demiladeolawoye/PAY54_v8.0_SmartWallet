-- PAY54 PR59: trusted writer negative lifecycle evidence (disposable CI only).
-- Operates as privileged test owner; does NOT certify restricted-role execution.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout='15s';
INSERT INTO pay54.auth_sessions
 (session_id,principal_id,token_digest,csrf_digest,active_account_id,
  session_status,session_version,issued_at,expires_at)
VALUES
 ('f1590000-0000-4000-8000-000000000001',
  '22222222-2222-4222-8222-222222222222',
  decode(repeat('a1',32),'hex'),decode(repeat('a2',32),'hex'),
  '22222222-2222-4222-8222-222222222222',
  'ACTIVE',1,clock_timestamp()-interval '1 minute',
  clock_timestamp()+interval '1 hour');

-- No active eligible wallet and multiple active eligible wallets both reject as
-- PAY54_PAYTAG_AMBIGUOUS_WALLET_DENIED; neither may claim a tag.
-- Each failure rolls back its own mutation subtransaction, preserving the
-- canonical fixture for the next negative case. No claim ever commits.
DO $test$
DECLARE
  v_case text;
  v_expected text;
  v_observed text;
BEGIN
  FOREACH v_case IN ARRAY ARRAY[
    'expired','revoked','rotated','suspended_account',
    'inactive_member','inactive_wallet','wrong_csrf','wrong_owner',
    'ambiguous_wallet'
  ] LOOP
    v_expected := CASE
      WHEN v_case IN ('ambiguous_wallet','inactive_wallet') THEN 'PAY54_PAYTAG_AMBIGUOUS_WALLET_DENIED'
      ELSE 'PAY54_PAYTAG_REGISTRATION_DENIED'
    END;
    v_observed := NULL;
    BEGIN
      CASE v_case
        WHEN 'expired' THEN
          UPDATE pay54.auth_sessions
            SET expires_at=clock_timestamp()-interval '1 second'
          WHERE session_id='f1590000-0000-4000-8000-000000000001';
        WHEN 'revoked' THEN
          UPDATE pay54.auth_sessions
            SET session_status='REVOKED',revoked_at=clock_timestamp()
          WHERE session_id='f1590000-0000-4000-8000-000000000001';
        WHEN 'rotated' THEN
          UPDATE pay54.auth_sessions SET session_version=2
          WHERE session_id='f1590000-0000-4000-8000-000000000001';
        WHEN 'suspended_account' THEN
          UPDATE pay54.account_contexts SET status='SUSPENDED'
          WHERE id='22222222-2222-4222-8222-222222222222';
        WHEN 'inactive_member' THEN
          UPDATE pay54.account_memberships SET status='SUSPENDED'
          WHERE account_id='22222222-2222-4222-8222-222222222222'
            AND principal_subject='22222222-2222-4222-8222-222222222222';
        WHEN 'inactive_wallet' THEN
          UPDATE pay54.wallets SET status='SUSPENDED'
          WHERE owner_subject='22222222-2222-4222-8222-222222222222';
        WHEN 'ambiguous_wallet' THEN
          INSERT INTO pay54.wallets(id,owner_subject,market_code,status)
          VALUES('f1590000-0000-4000-8000-000000000009',
                 '22222222-2222-4222-8222-222222222222','GB','ACTIVE');
          INSERT INTO pay54.personal_wallet_bindings(wallet_id,account_id)
          VALUES('f1590000-0000-4000-8000-000000000009',
                 '22222222-2222-4222-8222-222222222222');
        ELSE NULL;
      END CASE;

      PERFORM * FROM pay54.register_paytag_trusted(
        decode(repeat('a1',32),'hex'),
        CASE WHEN v_case='wrong_csrf' THEN decode(repeat('ff',32),'hex')
             ELSE decode(repeat('a2',32),'hex') END,
        'f1590000-0000-4000-8000-000000000001',1,
        CASE WHEN v_case='wrong_owner'
             THEN '11111111-1111-4111-8111-111111111111'::uuid
             ELSE '22222222-2222-4222-8222-222222222222'::uuid END,
        '22222222-2222-4222-8222-222222222222',
        'pr59_negative_claim',decode(repeat('a3',32),'hex'),
        decode(repeat('a4',32),'hex'),
        'f1590000-0000-4000-8000-000000000002',
        'f1590000-0000-4000-8000-000000000003');
      RAISE EXCEPTION 'PR59_UNEXPECTED_SUCCESS_%',v_case;
    EXCEPTION WHEN raise_exception THEN
      GET STACKED DIAGNOSTICS v_observed=MESSAGE_TEXT;
      IF v_observed<>v_expected THEN
        RAISE EXCEPTION 'PR59_CASE_%_EXPECTED_%_GOT_%',
          v_case,v_expected,v_observed;
      END IF;
    END;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pay54.paytag_registry
     WHERE canonical_alias='pr59_negative_claim')
     OR EXISTS (SELECT 1 FROM pay54.paytag_registration_requests
       WHERE request_id='f1590000-0000-4000-8000-000000000002')
  THEN RAISE EXCEPTION 'PR59_NEGATIVE_CASE_PERSISTED'; END IF;
END
$test$;
ROLLBACK;
