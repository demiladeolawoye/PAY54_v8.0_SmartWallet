-- PAY54 Batch 22 / 856 — actor GUC is transaction local and not pooled.
\set ON_ERROR_STOP on
SET ROLE pay54_account_directory_read_role;
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT set_config('pay54.actor_id','11111111-1111-4111-8111-111111111111',true);
SELECT 1/(CASE WHEN count(*)=2 THEN 1 ELSE 0 END) AS actor_scoped_rows
  FROM pay54.account_contexts;
COMMIT;

-- Same SQL connection, new transaction, no new trusted actor binding.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END)
 AS previous_actor_not_reused_across_requests
 FROM pay54.account_contexts;
SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END)
 AS previous_memberships_not_reused_across_requests
 FROM pay54.account_memberships;
COMMIT;
RESET ROLE;
