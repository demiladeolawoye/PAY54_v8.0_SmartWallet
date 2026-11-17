-- PAY54 Batch 22 / 858 — malformed actor GUC must never produce rows.
\set ON_ERROR_STOP on
SET ROLE pay54_account_directory_read_role;
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT set_config('pay54.actor_id','untrusted-browser-user',true);
DO $$
DECLARE received_state text;
BEGIN
  BEGIN
    PERFORM count(*) FROM pay54.account_contexts;
    RAISE EXCEPTION 'PAY54_MALFORMED_ACTOR_WAS_ACCEPTED';
  EXCEPTION WHEN invalid_text_representation THEN
    -- Invalid UUID is a request-denial, never a fallback to global tenant.
    NULL;
  END;
END $$;
COMMIT;
RESET ROLE;

SET ROLE pay54_account_directory_read_role;
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT set_config('pay54.actor_id','99999999-9999-4999-8999-999999999999',true);
SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END)
 AS unknown_actor_cannot_list_accounts
 FROM pay54.account_contexts;
COMMIT;
RESET ROLE;
