-- PAY54 Batch38 - disposable, forward/read-only/rollback end-to-end.
\set ON_ERROR_STOP on
\echo PAY54_B38_START
DO $pre$
BEGIN
 IF to_regprocedure('pay54.wallet_read_restricted_v1(bytea,uuid,uuid,character varying)') IS NOT NULL
 THEN RAISE EXCEPTION 'PAY54_B38_REUSED_PREVIOUS_DEPLOYMENT'; END IF;
END $pre$;
CREATE ROLE pay54_wallet_b38_ci_login LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS
 NOCREATEDB NOCREATEROLE NOREPLICATION;
GRANT pay54_wallet_read_caller_role TO pay54_wallet_b38_ci_login;
-- No password is set. This exercises SQL role assumption, NOT real cloud/TLS login.

INSERT INTO pay54.account_contexts
(id,legal_owner_subject,account_type,display_name,status,verification_status)
VALUES('b3800000-0000-4000-8000-000000000001',
'b3800000-0000-4000-8000-000000000002',
'PERSONAL','Batch38 isolated','ACTIVE','VERIFIED');
INSERT INTO pay54.account_memberships(account_id,principal_subject,role,status)
VALUES('b3800000-0000-4000-8000-000000000001',
'b3800000-0000-4000-8000-000000000002','PERSONAL_OWNER','ACTIVE');
INSERT INTO pay54.wallets(id,owner_subject,market_code,status)
VALUES('b3800000-0000-4000-8000-000000000003',
'b3800000-0000-4000-8000-000000000002','GB','ACTIVE');
INSERT INTO pay54.personal_wallet_bindings(account_id,wallet_id)
VALUES('b3800000-0000-4000-8000-000000000001',
'b3800000-0000-4000-8000-000000000003');
INSERT INTO pay54.ledger_accounts(id,wallet_id,currency,account_class,account_reference,status)
VALUES('b3800000-0000-4000-8000-000000000004',
'b3800000-0000-4000-8000-000000000003','GBP',
'CUSTOMER_LIABILITY','batch38-disposable','OPEN');
INSERT INTO pay54.auth_sessions(
session_id,principal_id,token_digest,csrf_digest,active_account_id,
session_status,session_version,issued_at,expires_at)
VALUES('b3800000-0000-4000-8000-000000000005',
'b3800000-0000-4000-8000-000000000002',
decode(repeat('38',32),'hex'),decode(repeat('39',32),'hex'),
'b3800000-0000-4000-8000-000000000001','ACTIVE',1,
clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 hour');

SET SESSION AUTHORIZATION pay54_wallet_b38_ci_login;
SELECT 1/(CASE WHEN session_user='pay54_wallet_b38_ci_login' THEN 1 ELSE 0 END)
 AS actual_session_authorization_assumption;
SET ROLE pay54_wallet_read_caller_role;
SELECT 1/(CASE WHEN current_user='pay54_wallet_read_caller_role' THEN 1 ELSE 0 END)
 AS exact_caller_identity;
DO $direct$
DECLARE forbidden boolean:=false;
BEGIN
 BEGIN
  PERFORM * FROM pay54.ledger_entries LIMIT 1;
 EXCEPTION WHEN insufficient_privilege THEN forbidden:=true;
 END;
 IF NOT forbidden THEN RAISE EXCEPTION 'PAY54_B38_DIRECT_FINANCIAL_ACCESS'; END IF;
END $direct$;
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT 1/(CASE WHEN count(*)=1 AND min(posted_minor)='0'
 AND min(held_minor)='0' THEN 1 ELSE 0 END) AS restricted_zero_accounting
FROM pay54.wallet_read_restricted_v1(
 decode(repeat('38',32),'hex'),
 'b3800000-0000-4000-8000-000000000001',
 'b3800000-0000-4000-8000-000000000003','GBP');
SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END)
 AS wrong_wallet_empty
FROM pay54.wallet_read_restricted_v1(
 decode(repeat('38',32),'hex'),
 'b3800000-0000-4000-8000-000000000001',
 'b3800000-0000-4000-8000-000000000006','GBP');
COMMIT;
RESET ROLE;
RESET SESSION AUTHORIZATION;

-- Remove all database test fixtures before the rollback proof.
DELETE FROM pay54.auth_sessions WHERE session_id='b3800000-0000-4000-8000-000000000005';
DELETE FROM pay54.ledger_accounts WHERE id='b3800000-0000-4000-8000-000000000004';
DELETE FROM pay54.personal_wallet_bindings WHERE account_id='b3800000-0000-4000-8000-000000000001';
DELETE FROM pay54.wallets WHERE id='b3800000-0000-4000-8000-000000000003';
DELETE FROM pay54.account_memberships WHERE account_id='b3800000-0000-4000-8000-000000000001';
DELETE FROM pay54.account_contexts WHERE id='b3800000-0000-4000-8000-000000000001';
REVOKE pay54_wallet_read_caller_role FROM pay54_wallet_b38_ci_login;
DROP ROLE pay54_wallet_b38_ci_login;
\echo PAY54_B38_ROLE_ASSUMPTION_AND_SQL_PASS
