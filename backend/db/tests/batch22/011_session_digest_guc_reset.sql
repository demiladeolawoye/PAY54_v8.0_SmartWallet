-- PAY54 Batch 22 / 857 — credential scope cannot survive a transaction.
\set ON_ERROR_STOP on
SET ROLE pay54_session_read_role;
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT set_config('pay54.session_digest',repeat('ab',32),true);
SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END)
 AS credential_scope_authorised
 FROM pay54.auth_sessions;
COMMIT;

BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END)
 AS credential_scope_not_reused
 FROM pay54.auth_sessions;
COMMIT;
RESET ROLE;
