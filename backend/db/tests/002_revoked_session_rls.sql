-- PAY54 Batch 22 / 834 — actual PostgreSQL revoked/expired session denial.
-- Run as superuser after migrations and 001_rls_tenant_isolation.sql.
\set ON_ERROR_STOP on

BEGIN;
UPDATE pay54.auth_sessions
 SET session_status = 'REVOKED', revoked_at = clock_timestamp()
 WHERE session_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SET ROLE pay54_ci_session_reader;
SELECT set_config('pay54.session_digest',repeat('ab',32),true);
SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END) AS revoked_session_hidden
 FROM pay54.auth_sessions;
RESET ROLE;
ROLLBACK;

BEGIN;
UPDATE pay54.auth_sessions
 SET expires_at = now() - interval '1 minute'
 WHERE session_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SET ROLE pay54_ci_session_reader;
SELECT set_config('pay54.session_digest',repeat('ab',32),true);
SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END) AS expired_session_hidden
 FROM pay54.auth_sessions;
RESET ROLE;
ROLLBACK;

SET ROLE pay54_ci_session_reader;
BEGIN READ ONLY;
SELECT set_config('pay54.session_digest',repeat('ab',32),true);
SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END) AS rollback_restored_active
 FROM pay54.auth_sessions;
COMMIT;
RESET ROLE;
