-- PAY54 Batch 23 / 897 — callable role cannot bypass function or write rows.
\set ON_ERROR_STOP on
BEGIN;
SET ROLE pay54_session_rotate_role;
DO $$
DECLARE code text;
BEGIN
  BEGIN
    PERFORM count(*) FROM pay54.auth_sessions;
    RAISE EXCEPTION 'PAY54_DIRECT_SESSION_READ_ACCEPTED';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE pay54.auth_sessions SET session_status='REVOKED'
    WHERE session_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    RAISE EXCEPTION 'PAY54_DIRECT_SESSION_REVOKE_ACCEPTED';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO pay54.account_context_audit (
      audit_id,principal_id,previous_account_id,next_account_id,
      previous_session_id,next_session_id,
      expected_previous_version,next_session_version,correlation_id
    ) VALUES (
      '88888888-8888-4888-8888-888888888888',
      '11111111-1111-4111-8111-111111111111',
      '11111111-1111-4111-8111-111111111111',
      '33333333-3333-4333-8333-333333333333',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      1,2,'77777777-7777-4777-8777-777777777777'
    );
    RAISE EXCEPTION 'PAY54_DIRECT_AUDIT_FORGERY_ACCEPTED';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM count(*) FROM pay54.ledger_entries;
    RAISE EXCEPTION 'PAY54_DIRECT_LEDGER_READ_ACCEPTED';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;
SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END)
 AS direct_role_bypass_did_not_modify_session
FROM pay54.auth_sessions
WHERE session_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  AND session_status='ACTIVE';
ROLLBACK;
