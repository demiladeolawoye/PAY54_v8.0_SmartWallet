-- PAY54 Batch 22 / 831. Execute only against disposable CI database.
-- Must be run as a database superuser AFTER migrations 001 and 002.
\set ON_ERROR_STOP on

CREATE ROLE pay54_ci_account_reader NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
CREATE ROLE pay54_ci_session_reader NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
GRANT USAGE ON SCHEMA pay54 TO pay54_ci_account_reader, pay54_ci_session_reader;
GRANT SELECT ON pay54.accounts, pay54.account_memberships TO pay54_ci_account_reader;
GRANT SELECT ON pay54.auth_sessions TO pay54_ci_session_reader;

INSERT INTO pay54.accounts
 (account_id, legal_owner_id, account_type, display_name, account_status, verification_status)
VALUES
 ('11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111',
 'PERSONAL','User A','ACTIVE','VERIFIED'),
 ('22222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222222',
 'PERSONAL','User B','ACTIVE','VERIFIED'),
 ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111',
 'BUSINESS','Business A','ACTIVE','VERIFIED');

INSERT INTO pay54.account_memberships(account_id, principal_id, member_role, member_status)
VALUES
 ('11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111',
 'PERSONAL_OWNER','ACTIVE'),
 ('22222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222222',
 'PERSONAL_OWNER','ACTIVE'),
 ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111',
 'BUSINESS_OWNER','ACTIVE'),
 ('33333333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222222',
 'BUSINESS_VIEWER','ACTIVE');

INSERT INTO pay54.auth_sessions(
 session_id, principal_id, token_digest, csrf_digest,
 active_account_id, session_status, session_version, issued_at, expires_at
) VALUES (
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '11111111-1111-4111-8111-111111111111',
 decode(repeat('ab',32),'hex'),
 decode(repeat('cd',32),'hex'),
 '11111111-1111-4111-8111-111111111111',
 'ACTIVE', 1, now() - interval '1 hour', now() + interval '1 hour'
);

SET ROLE pay54_ci_account_reader;
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT set_config('pay54.actor_id','11111111-1111-4111-8111-111111111111',true);
-- Actor A sees their personal account and owned business, not User B.
SELECT 1/(CASE WHEN count(*)=2 THEN 1 ELSE 0 END) AS actor_a_accounts
 FROM pay54.accounts;
SELECT 1/(CASE WHEN count(*)=2 THEN 1 ELSE 0 END) AS actor_a_memberships
 FROM pay54.account_memberships;
SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END) AS actor_a_must_not_see_b
 FROM pay54.accounts WHERE account_id='22222222-2222-4222-8222-222222222222';
COMMIT;

BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT set_config('pay54.actor_id','22222222-2222-4222-8222-222222222222',true);
-- Actor B sees their personal account plus permitted Business viewer, not A.
SELECT 1/(CASE WHEN count(*)=2 THEN 1 ELSE 0 END) AS actor_b_accounts
 FROM pay54.accounts;
SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END) AS actor_b_must_not_see_a
 FROM pay54.accounts WHERE account_id='11111111-1111-4111-8111-111111111111';
COMMIT;
RESET ROLE;

SET ROLE pay54_ci_session_reader;
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT set_config('pay54.session_digest',repeat('ab',32),true);
SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END) AS matching_digest_session
 FROM pay54.auth_sessions;
COMMIT;

BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT set_config('pay54.session_digest',repeat('ff',32),true);
SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END) AS unknown_digest_denied
 FROM pay54.auth_sessions;
COMMIT;
RESET ROLE;

-- Runtime roles must not be granted DML.
SELECT 1/(CASE WHEN has_table_privilege('pay54_ci_account_reader',
 'pay54.accounts','INSERT,UPDATE,DELETE,TRUNCATE') = false
 THEN 1 ELSE 0 END) AS no_account_write_rights;
SELECT 1/(CASE WHEN has_table_privilege('pay54_ci_session_reader',
 'pay54.auth_sessions','INSERT,UPDATE,DELETE,TRUNCATE') = false
 THEN 1 ELSE 0 END) AS no_session_write_rights;
