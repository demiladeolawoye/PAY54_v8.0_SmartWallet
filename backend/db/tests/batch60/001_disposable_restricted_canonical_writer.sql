-- PAY54 Wave7 — genuine canonical reserve/capture/release through a restricted
-- SECURITY DEFINER owner, in one disposable PG16 transaction, ROLLBACK ONLY.
-- The temporary writer ACL/RLS policies are NOT a deployable migration.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout='40s';
SET LOCAL lock_timeout='5s';
DO $guard$
BEGIN
 IF current_database()<>'pay54_disposable_ci' OR session_user<>'postgres'
 OR current_user<>'postgres'
 OR to_regprocedure('pay54.wallet_read_restricted_v1(bytea,uuid,uuid,character varying)') IS NULL
 OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN
   ('pay54_w7_disposable_owner','pay54_w7_disposable_caller'))
 THEN RAISE EXCEPTION 'PAY54_W7_DISPOSABLE_ONLY'; END IF;
END $guard$;
CREATE ROLE pay54_w7_disposable_owner NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE ROLE pay54_w7_disposable_caller NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;

-- Funding, accounts and user identity are fixtures installed by disposable admin.
UPDATE pay54.currencies SET active=TRUE WHERE code='NGN';
INSERT INTO pay54.account_contexts
(id,legal_owner_subject,account_type,display_name,status,verification_status)
VALUES ('a6700000-0000-4000-8000-000000000001',
        'a6700000-0000-4000-8000-000000000011',
        'PERSONAL','Wave7 disposable owner','ACTIVE','VERIFIED');
INSERT INTO pay54.account_memberships(account_id,principal_subject,role,status)
VALUES ('a6700000-0000-4000-8000-000000000001',
        'a6700000-0000-4000-8000-000000000011','PERSONAL_OWNER','ACTIVE');
INSERT INTO pay54.auth_sessions
(session_id,principal_id,token_digest,csrf_digest,active_account_id,
session_status,session_version,issued_at,expires_at)
VALUES ('a6700000-0000-4000-8000-000000000101',
        'a6700000-0000-4000-8000-000000000011',
        decode(repeat('a7',32),'hex'),decode(repeat('b7',32),'hex'),
        'a6700000-0000-4000-8000-000000000001',
        'ACTIVE',1,clock_timestamp()-interval '2 minutes',
        clock_timestamp()+interval '1 hour');

INSERT INTO pay54.wallets(id,owner_subject,market_code,status)
VALUES ('a6700000-0000-4000-8000-000000000201',
        'a6700000-0000-4000-8000-000000000011','NG','ACTIVE'),
       ('a6700000-0000-4000-8000-000000000202',
        'a6700000-0000-4000-8000-000000000012','NG','ACTIVE');
INSERT INTO pay54.ledger_accounts
(id,wallet_id,currency,account_class,account_reference)
VALUES ('a6700000-0000-4000-8000-000000000301',
        'a6700000-0000-4000-8000-000000000201','NGN','CUSTOMER_LIABILITY','wave7-disposable-source'),
       ('a6700000-0000-4000-8000-000000000302',
        'a6700000-0000-4000-8000-000000000202','NGN','CUSTOMER_LIABILITY','wave7-disposable-destination'),
       ('a6700000-0000-4000-8000-000000000303',
        NULL,'NGN','PROVIDER_CLEARING','wave7-disposable-clearing');
INSERT INTO pay54.ledger_journals(id,journal_type)
VALUES ('a6700000-0000-4000-8000-000000000401','FUNDING');
INSERT INTO pay54.ledger_entries(journal_id,account_id,currency,amount_minor)
VALUES ('a6700000-0000-4000-8000-000000000401','a6700000-0000-4000-8000-000000000301','NGN',10000),
       ('a6700000-0000-4000-8000-000000000401','a6700000-0000-4000-8000-000000000303','NGN',-10000);
UPDATE pay54.ledger_journals SET status='POSTED',posted_at=clock_timestamp()
 WHERE id='a6700000-0000-4000-8000-000000000401';
SET CONSTRAINTS ALL IMMEDIATE;

-- Restrict application to one SECURITY DEFINER wrapper; it never receives
-- direct canonical function or customer-financial-table permissions.
GRANT USAGE ON SCHEMA pay54 TO pay54_w7_disposable_owner,pay54_w7_disposable_caller;
GRANT SELECT ON pay54.auth_sessions,pay54.account_contexts,pay54.account_memberships,
 pay54.currencies,pay54.wallets,pay54.ledger_accounts,pay54.ledger_entries,
 pay54.ledger_journals,pay54.financial_operations,pay54.idempotency_records,
 pay54.balance_reservations,pay54.provider_attempts
 TO pay54_w7_disposable_owner;
GRANT UPDATE ON pay54.auth_sessions,pay54.ledger_accounts,pay54.ledger_journals,
 pay54.financial_operations,pay54.idempotency_records,pay54.balance_reservations
 TO pay54_w7_disposable_owner;
GRANT INSERT ON pay54.ledger_entries,pay54.ledger_journals,pay54.financial_operations,
 pay54.idempotency_records,pay54.balance_reservations,pay54.outbox_events
 TO pay54_w7_disposable_owner;
GRANT EXECUTE ON FUNCTION pay54.reserve_wallet_transfer(uuid,uuid,uuid,bigint,text,text,timestamp with time zone),
 pay54.capture_reserved_wallet_transfer(uuid,uuid),
 pay54.release_reserved_wallet_transfer(uuid,uuid,text)
 TO pay54_w7_disposable_owner;

-- Disposable-only RLS predicates constrain the non-superuser owner to fixtures.
-- Production must use independently reviewed non-forgeable claims and policy.
CREATE POLICY pay54_w7_session_select ON pay54.auth_sessions
 FOR SELECT TO pay54_w7_disposable_owner USING (
  token_digest=decode(NULLIF(current_setting('pay54.w7_digest',true),''),'hex')
  AND session_status='ACTIVE' AND revoked_at IS NULL
  AND expires_at>clock_timestamp());
CREATE POLICY pay54_w7_session_update ON pay54.auth_sessions
 FOR UPDATE TO pay54_w7_disposable_owner USING (
  token_digest=decode(NULLIF(current_setting('pay54.w7_digest',true),''),'hex')
  AND session_status='ACTIVE' AND revoked_at IS NULL)
 WITH CHECK (session_status='ACTIVE');
CREATE POLICY pay54_w7_account ON pay54.account_contexts
 FOR SELECT TO pay54_w7_disposable_owner USING(
  id='a6700000-0000-4000-8000-000000000001'
  AND legal_owner_subject='a6700000-0000-4000-8000-000000000011');
CREATE POLICY pay54_w7_membership ON pay54.account_memberships
 FOR SELECT TO pay54_w7_disposable_owner USING(
  account_id='a6700000-0000-4000-8000-000000000001'
  AND principal_subject='a6700000-0000-4000-8000-000000000011'
  AND status='ACTIVE');
CREATE POLICY pay54_w7_wallets ON pay54.wallets
 FOR SELECT TO pay54_w7_disposable_owner USING(
 id IN ('a6700000-0000-4000-8000-000000000201',
        'a6700000-0000-4000-8000-000000000202'));
CREATE POLICY pay54_w7_accounts ON pay54.ledger_accounts
 FOR ALL TO pay54_w7_disposable_owner USING(
 id IN ('a6700000-0000-4000-8000-000000000301',
        'a6700000-0000-4000-8000-000000000302'))
 WITH CHECK(id IN ('a6700000-0000-4000-8000-000000000301',
                   'a6700000-0000-4000-8000-000000000302'));
CREATE POLICY pay54_w7_entries ON pay54.ledger_entries
 FOR ALL TO pay54_w7_disposable_owner USING(
 account_id IN ('a6700000-0000-4000-8000-000000000301',
                'a6700000-0000-4000-8000-000000000302'))
 WITH CHECK(account_id IN ('a6700000-0000-4000-8000-000000000301',
                           'a6700000-0000-4000-8000-000000000302'));
CREATE POLICY pay54_w7_journals ON pay54.ledger_journals
 FOR ALL TO pay54_w7_disposable_owner USING(
   (journal_type='FUNDING' AND id='a6700000-0000-4000-8000-000000000401')
   OR journal_type='TRANSFER')
 WITH CHECK(journal_type='TRANSFER');
CREATE POLICY pay54_w7_holds ON pay54.balance_reservations
 FOR ALL TO pay54_w7_disposable_owner USING(
   account_id='a6700000-0000-4000-8000-000000000301')
 WITH CHECK(account_id='a6700000-0000-4000-8000-000000000301');

-- Create actual wrapper as its NON-SUPERUSER owner, then immediately remove
-- DDL permission. The caller can EXECUTE only this attesting entrypoint.
GRANT CREATE ON SCHEMA pay54 TO pay54_w7_disposable_owner;
SET LOCAL ROLE pay54_w7_disposable_owner;
CREATE FUNCTION pay54.w7_disposable_attested_money(
 p_digest bytea,p_account uuid,p_version bigint,p_action text,
 p_source uuid,p_destination uuid,p_amount bigint,p_key text,
 p_request_digest text,p_operation uuid,p_reason text
) RETURNS TABLE(operation_id uuid,outcome text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pay54
AS $function$
DECLARE actor uuid;
BEGIN
 IF p_digest IS NULL OR octet_length(p_digest)<>32
 OR p_account IS NULL OR p_version IS NULL OR p_version<=0
 OR p_action NOT IN ('RESERVE','CAPTURE','RELEASE')
 THEN RAISE EXCEPTION 'PAY54_W7_IDENTITY_DENIED' USING ERRCODE='P5457'; END IF;
 PERFORM set_config('pay54.w7_digest',encode(p_digest,'hex'),true);
 SELECT s.principal_id INTO actor FROM pay54.auth_sessions s
  WHERE s.token_digest=p_digest AND s.active_account_id=p_account
   AND s.session_status='ACTIVE' AND s.revoked_at IS NULL
   AND s.session_version=p_version
   AND s.issued_at<=clock_timestamp() AND s.expires_at>clock_timestamp()
  FOR UPDATE OF s;
 IF actor IS NULL OR NOT EXISTS(
  SELECT 1 FROM pay54.account_contexts a
  JOIN pay54.account_memberships m ON m.account_id=a.id
  WHERE a.id=p_account AND a.legal_owner_subject=actor
   AND a.account_type='PERSONAL' AND a.status='ACTIVE'
   AND a.verification_status='VERIFIED'
   AND m.principal_subject=actor AND m.role='PERSONAL_OWNER'
   AND m.status='ACTIVE'
 ) THEN RAISE EXCEPTION 'PAY54_W7_IDENTITY_DENIED' USING ERRCODE='P5457'; END IF;
 IF p_action='RESERVE' THEN
  RETURN QUERY SELECT * FROM pay54.reserve_wallet_transfer(
   actor,p_source,p_destination,p_amount,p_key,p_request_digest,
   clock_timestamp()+interval '1 hour');
 ELSIF p_action='CAPTURE' THEN
  RETURN QUERY SELECT * FROM pay54.capture_reserved_wallet_transfer(
   actor,p_operation);
 ELSE
  RETURN QUERY SELECT * FROM pay54.release_reserved_wallet_transfer(
   actor,p_operation,p_reason);
 END IF;
END;
$function$;
RESET ROLE;
REVOKE CREATE ON SCHEMA pay54 FROM pay54_w7_disposable_owner;
REVOKE ALL ON FUNCTION pay54.w7_disposable_attested_money(
 bytea,uuid,bigint,text,uuid,uuid,bigint,text,text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pay54.w7_disposable_attested_money(
 bytea,uuid,bigint,text,uuid,uuid,bigint,text,text,uuid,text)
 TO pay54_w7_disposable_caller;

DO $privilege$
BEGIN
 IF NOT has_function_privilege('pay54_w7_disposable_caller',
  'pay54.w7_disposable_attested_money(bytea,uuid,bigint,text,uuid,uuid,bigint,text,text,uuid,text)','EXECUTE')
 OR has_function_privilege('pay54_w7_disposable_caller',
  'pay54.reserve_wallet_transfer(uuid,uuid,uuid,bigint,text,text,timestamp with time zone)','EXECUTE')
 OR has_table_privilege('pay54_w7_disposable_caller','pay54.ledger_entries','SELECT')
 OR has_table_privilege('pay54_w7_disposable_caller','pay54.balance_reservations','INSERT')
 OR NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_roles r ON r.oid=p.proowner
  WHERE p.oid='pay54.w7_disposable_attested_money(bytea,uuid,bigint,text,uuid,uuid,bigint,text,text,uuid,text)'::regprocedure
  AND r.rolname='pay54_w7_disposable_owner' AND p.prosecdef)
 THEN RAISE EXCEPTION 'PAY54_W7_DISPOSABLE_PRIVILEGE_GRAPH_INVALID'; END IF;
END $privilege$;

SET LOCAL ROLE pay54_w7_disposable_caller;
DO $positive$
DECLARE v_capture uuid;v_release uuid;v_outcome text;v_replay uuid;v_denied boolean;
BEGIN
 SELECT operation_id,outcome INTO v_capture,v_outcome
 FROM pay54.w7_disposable_attested_money(
 decode(repeat('a7',32),'hex'),
 'a6700000-0000-4000-8000-000000000001',1,'RESERVE',
 'a6700000-0000-4000-8000-000000000301',
 'a6700000-0000-4000-8000-000000000202',
 6000,'wave7-disposable-capture-0001',repeat('a',64),NULL,NULL);
 IF v_capture IS NULL OR v_outcome<>'CREATED'
 THEN RAISE EXCEPTION 'PAY54_W7_RESERVE_FAILED'; END IF;
 SELECT operation_id,outcome INTO v_replay,v_outcome
 FROM pay54.w7_disposable_attested_money(
 decode(repeat('a7',32),'hex'),
 'a6700000-0000-4000-8000-000000000001',1,'RESERVE',
 'a6700000-0000-4000-8000-000000000301',
 'a6700000-0000-4000-8000-000000000202',
 6000,'wave7-disposable-capture-0001',repeat('a',64),NULL,NULL);
 IF v_replay IS DISTINCT FROM v_capture OR v_outcome<>'REPLAY'
 THEN RAISE EXCEPTION 'PAY54_W7_IDEMPOTENCY_FAILED'; END IF;
 SELECT outcome INTO v_outcome FROM pay54.w7_disposable_attested_money(
 decode(repeat('a7',32),'hex'),
 'a6700000-0000-4000-8000-000000000001',1,'CAPTURE',
 NULL,NULL,NULL,NULL,NULL,v_capture,NULL);
 IF v_outcome<>'CAPTURED' THEN RAISE EXCEPTION 'PAY54_W7_CAPTURE_FAILED'; END IF;
 SELECT operation_id,outcome INTO v_release,v_outcome
 FROM pay54.w7_disposable_attested_money(
 decode(repeat('a7',32),'hex'),
 'a6700000-0000-4000-8000-000000000001',1,'RESERVE',
 'a6700000-0000-4000-8000-000000000301',
 'a6700000-0000-4000-8000-000000000202',
 3000,'wave7-disposable-release-0002',repeat('b',64),NULL,NULL);
 IF v_release IS NULL OR v_outcome<>'CREATED'
 THEN RAISE EXCEPTION 'PAY54_W7_SECOND_RESERVATION_FAILED'; END IF;
 SELECT outcome INTO v_outcome FROM pay54.w7_disposable_attested_money(
 decode(repeat('a7',32),'hex'),
 'a6700000-0000-4000-8000-000000000001',1,'RELEASE',
 NULL,NULL,NULL,NULL,NULL,v_release,'CUSTOMER_CANCELLED');
 IF v_outcome<>'RELEASED' THEN RAISE EXCEPTION 'PAY54_W7_RELEASE_FAILED'; END IF;
 v_denied:=false;
 BEGIN
  PERFORM * FROM pay54.w7_disposable_attested_money(
   decode(repeat('c7',32),'hex'),
   'a6700000-0000-4000-8000-000000000001',1,'RESERVE',
   'a6700000-0000-4000-8000-000000000301',
   'a6700000-0000-4000-8000-000000000202',
   100,'wave7-disposable-denied-0003',repeat('c',64),NULL,NULL);
 EXCEPTION WHEN SQLSTATE 'P5457' THEN v_denied:=true;
 END;
 IF NOT v_denied THEN RAISE EXCEPTION 'PAY54_W7_FOREIGN_TOKEN_ACCEPTED'; END IF;
 v_denied:=false;
 BEGIN
  PERFORM * FROM pay54.w7_disposable_attested_money(
   decode(repeat('a7',32),'hex'),
   'a6700000-0000-4000-8000-000000000001',2,'CAPTURE',
   NULL,NULL,NULL,NULL,NULL,v_capture,NULL);
 EXCEPTION WHEN SQLSTATE 'P5457' THEN v_denied:=true;
 END;
 IF NOT v_denied THEN RAISE EXCEPTION 'PAY54_W7_STALE_VERSION_ACCEPTED'; END IF;
END $positive$;
RESET ROLE;
DO $verify$
DECLARE op_count integer;journal_count integer;outbox_count integer;zero_sum numeric;
BEGIN
 SELECT count(*) INTO op_count FROM pay54.financial_operations
 WHERE owner_subject='a6700000-0000-4000-8000-000000000011';
 SELECT count(*) INTO journal_count FROM pay54.ledger_journals
 WHERE journal_type='TRANSFER' AND status='POSTED'
 AND operation_id IN (SELECT id FROM pay54.financial_operations
 WHERE owner_subject='a6700000-0000-4000-8000-000000000011');
 SELECT count(*) INTO outbox_count FROM pay54.outbox_events
 WHERE aggregate_id IN (SELECT id FROM pay54.financial_operations
 WHERE owner_subject='a6700000-0000-4000-8000-000000000011');
 SELECT coalesce(sum(e.amount_minor::numeric),0) INTO zero_sum
 FROM pay54.ledger_entries e JOIN pay54.ledger_journals j ON j.id=e.journal_id
 WHERE j.operation_id IN (SELECT id FROM pay54.financial_operations
 WHERE owner_subject='a6700000-0000-4000-8000-000000000011')
 AND j.journal_type='TRANSFER';
 IF op_count<>2 OR journal_count<>1 OR outbox_count<>4 OR zero_sum<>0
 OR (SELECT coalesce(sum(e.amount_minor::numeric),0)
     FROM pay54.ledger_entries e JOIN pay54.ledger_journals j ON j.id=e.journal_id
     WHERE e.account_id='a6700000-0000-4000-8000-000000000301'
     AND j.status='POSTED')<>4000
 OR (SELECT coalesce(sum(e.amount_minor::numeric),0)
     FROM pay54.ledger_entries e JOIN pay54.ledger_journals j ON j.id=e.journal_id
     WHERE e.account_id='a6700000-0000-4000-8000-000000000302'
     AND j.status='POSTED')<>6000
 THEN RAISE EXCEPTION 'PAY54_W7_FINANCIAL_INVARIANT_FAILED operations=% journals=% outbox=% zero=%',
 op_count,journal_count,outbox_count,zero_sum; END IF;
END $verify$;
ROLLBACK;
DO $rollback$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN
 ('pay54_w7_disposable_owner','pay54_w7_disposable_caller'))
 OR to_regprocedure('pay54.w7_disposable_attested_money(bytea,uuid,bigint,text,uuid,uuid,bigint,text,text,uuid,text)') IS NOT NULL
 OR EXISTS(SELECT 1 FROM pg_policies WHERE policyname LIKE 'pay54_w7_%')
 OR EXISTS(SELECT 1 FROM pay54.auth_sessions
  WHERE session_id='a6700000-0000-4000-8000-000000000101')
 THEN RAISE EXCEPTION 'PAY54_W7_ROLLBACK_INCOMPLETE'; END IF;
END $rollback$;
\echo PAY54_W7_CANONICAL_RESTRICTED_WRITER_ROLLBACK_PASS
