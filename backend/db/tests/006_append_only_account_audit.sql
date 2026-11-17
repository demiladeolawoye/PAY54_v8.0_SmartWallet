-- PAY54 Batch 22 / 844 — append-only audit test in disposable PostgreSQL.
\set ON_ERROR_STOP on


SET ROLE pay54_context_audit_insert_role;
BEGIN;
SELECT set_config('pay54.actor_id','11111111-1111-4111-8111-111111111111',true);
INSERT INTO pay54.account_context_audit (
  audit_id, principal_id, previous_account_id, next_account_id,
  previous_session_id, next_session_id,
  expected_previous_version, next_session_version, correlation_id
) VALUES (
  '66666666-6666-4666-8666-666666666666',
  '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  1, 2, '77777777-7777-4777-8777-777777777777'
);
COMMIT;
RESET ROLE;

SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END) AS durable_audit_inserted
  FROM pay54.account_context_audit
  WHERE audit_id='66666666-6666-4666-8666-666666666666';

DO $$
BEGIN
  BEGIN
    UPDATE pay54.account_context_audit SET next_session_version=3
    WHERE audit_id='66666666-6666-4666-8666-666666666666';
    RAISE EXCEPTION 'PAY54_TEST_AUDIT_UPDATE_ACCEPTED';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    DELETE FROM pay54.account_context_audit
    WHERE audit_id='66666666-6666-4666-8666-666666666666';
    RAISE EXCEPTION 'PAY54_TEST_AUDIT_DELETE_ACCEPTED';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END
$$;

SELECT 1/(CASE WHEN has_table_privilege('pay54_context_audit_insert_role',
 'pay54.account_context_audit','UPDATE,DELETE,TRUNCATE')=false
 THEN 1 ELSE 0 END) AS audit_writer_cannot_rewrite;
