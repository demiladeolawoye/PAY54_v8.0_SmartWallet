-- PAY54 Batch32 — ephemeral PostgreSQL 16 source integration; no persist.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='20s';

DO $fixture$
DECLARE
 a uuid:='b3200000-0000-4000-8000-000000000001';
 p uuid:='b3200000-0000-4000-8000-000000000002';
 w uuid:='b3200000-0000-4000-8000-000000000003';
 la uuid:='b3200000-0000-4000-8000-000000000004';
 s uuid:='b3200000-0000-4000-8000-000000000005';
BEGIN
 INSERT INTO pay54.account_contexts(id,legal_owner_subject,account_type,display_name,status,verification_status)
 VALUES(a,p,'PERSONAL','Batch32 verified','ACTIVE','VERIFIED');
 INSERT INTO pay54.account_memberships(account_id,principal_subject,role,status)
 VALUES(a,p,'PERSONAL_OWNER','ACTIVE');
 INSERT INTO pay54.wallets(id,owner_subject,market_code,status)
 VALUES(w,p,'GB','ACTIVE');
 INSERT INTO pay54.personal_wallet_bindings(account_id,wallet_id) VALUES(a,w);
 INSERT INTO pay54.ledger_accounts(id,wallet_id,currency,account_class,account_reference,status)
 VALUES(la,w,'GBP','CUSTOMER_LIABILITY','batch32-test-liability','OPEN');
 INSERT INTO pay54.auth_sessions
 (session_id,principal_id,token_digest,csrf_digest,active_account_id,session_status,session_version,issued_at,expires_at)
 VALUES(s,p,decode(repeat('b3',32),'hex'),decode(repeat('c3',32),'hex'),
 a,'ACTIVE',1,clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 hour');
END $fixture$;

-- Read requires all four bound values, active verified ownership and session.
\set posted_net_minor SENTINEL
\set currency SENTINEL
EXECUTE pay54_wallet_posted_net_read(
 decode(repeat('b3',32),'hex'),
 'b3200000-0000-4000-8000-000000000001',
 'b3200000-0000-4000-8000-000000000003','GBP') \gset
SELECT 1/(CASE WHEN :'posted_net_minor'='0' AND :'currency'='GBP'
 THEN 1 ELSE 0 END) AS canonical_zero_balance;

-- Cross-account requested identity must not produce a row.
\set account_id NO_MATCH
\set ON_ERROR_STOP off
EXECUTE pay54_wallet_posted_net_read(
 decode(repeat('b3',32),'hex'),
 'b3200000-0000-4000-8000-000000000002',
 'b3200000-0000-4000-8000-000000000003','GBP') \gset
\set ON_ERROR_STOP on
SELECT 1/(CASE WHEN :'account_id'='NO_MATCH' THEN 1 ELSE 0 END)
 AS different_account_denied;

-- A stolen/unrelated token digest must never retrieve this ledger net.
\set account_id NO_MATCH
\set ON_ERROR_STOP off
EXECUTE pay54_wallet_posted_net_read(
 decode(repeat('ee',32),'hex'),
 'b3200000-0000-4000-8000-000000000001',
 'b3200000-0000-4000-8000-000000000003','GBP') \gset
\set ON_ERROR_STOP on
SELECT 1/(CASE WHEN :'account_id'='NO_MATCH' THEN 1 ELSE 0 END)
 AS wrong_session_digest_denied;

-- A suspended membership revokes access independently of an ACTIVE token.
UPDATE pay54.account_memberships SET status='SUSPENDED'
 WHERE account_id='b3200000-0000-4000-8000-000000000001';
\set account_id NO_MATCH
\set ON_ERROR_STOP off
EXECUTE pay54_wallet_posted_net_read(
 decode(repeat('b3',32),'hex'),
 'b3200000-0000-4000-8000-000000000001',
 'b3200000-0000-4000-8000-000000000003','GBP') \gset
\set ON_ERROR_STOP on
SELECT 1/(CASE WHEN :'account_id'='NO_MATCH' THEN 1 ELSE 0 END)
 AS suspended_membership_denied;
UPDATE pay54.account_memberships SET status='ACTIVE'
 WHERE account_id='b3200000-0000-4000-8000-000000000001';

-- Session revocation must be visible to a subsequent new query.
UPDATE pay54.auth_sessions SET session_status='REVOKED',revoked_at=clock_timestamp()
 WHERE session_id='b3200000-0000-4000-8000-000000000005';
\set account_id NO_MATCH
\set ON_ERROR_STOP off
EXECUTE pay54_wallet_posted_net_read(
 decode(repeat('b3',32),'hex'),
 'b3200000-0000-4000-8000-000000000001',
 'b3200000-0000-4000-8000-000000000003','GBP') \gset
\set ON_ERROR_STOP on
SELECT 1/(CASE WHEN :'account_id'='NO_MATCH' THEN 1 ELSE 0 END)
 AS revoked_session_denied;

-- Canonical reader remains inert and cannot read posted journal entries,
-- sessions or wallet balances, irrespective of CI superuser query proof.
SELECT 1/(CASE WHEN NOT has_table_privilege('pay54_account_reader_role',
 'pay54.ledger_entries','SELECT')
 AND NOT has_table_privilege('pay54_account_reader_role',
 'pay54.auth_sessions','SELECT')
 AND NOT has_table_privilege('pay54_account_reader_role',
 'pay54.ledger_accounts','SELECT')
 THEN 1 ELSE 0 END) AS no_unsafe_reader_grants;

ROLLBACK;
DEALLOCATE pay54_wallet_posted_net_read;
SELECT 1/(CASE WHEN NOT EXISTS (
 SELECT 1 FROM pay54.account_contexts
 WHERE id='b3200000-0000-4000-8000-000000000001'
) THEN 1 ELSE 0 END) AS fixture_rollback_confirmed;
