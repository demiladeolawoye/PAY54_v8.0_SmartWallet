-- PAY54 Batch54 — REAL PG16 restricted-role, session-bound SYNTHETIC ledger proof.
-- This deliberately does not grant or execute any canonical pay54 money function.
-- All DDL/DML/role changes happen inside one rollback-only CI transaction.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout='35s';
SET LOCAL lock_timeout='5s';
DO $pre$
BEGIN
 IF current_database()<>'pay54_disposable_ci'
 OR session_user<>'postgres' OR current_user<>'postgres'
 OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='pay54_b54_writer')
 OR to_regnamespace('pay54_b54') IS NOT NULL
 THEN RAISE EXCEPTION 'PAY54_B54_DISPOSABLE_PRECONDITION_DENIED'; END IF;
END $pre$;
CREATE ROLE pay54_b54_writer NOLOGIN NOINHERIT NOSUPERUSER
 NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE SCHEMA pay54_b54;
CREATE TABLE pay54_b54.sessions(
 id uuid PRIMARY KEY,principal uuid NOT NULL,status text NOT NULL
 CHECK(status IN ('ACTIVE','REVOKED')),version integer NOT NULL CHECK(version>0)
);
CREATE TABLE pay54_b54.accounts(
 id uuid PRIMARY KEY,owner uuid NOT NULL,currency char(3) NOT NULL
);
CREATE TABLE pay54_b54.journals(
 id uuid PRIMARY KEY,owner uuid NOT NULL,idempotency_key text NOT NULL,
 digest text NOT NULL CHECK(digest ~ '^[a-f0-9]{64}$'),
 UNIQUE(owner,idempotency_key)
);
CREATE TABLE pay54_b54.entries(
 id uuid PRIMARY KEY, journal_id uuid NOT NULL REFERENCES pay54_b54.journals(id),
 account_id uuid NOT NULL REFERENCES pay54_b54.accounts(id),
 owner uuid NOT NULL,amount_minor bigint NOT NULL CHECK(amount_minor<>0)
);
CREATE TABLE pay54_b54.outbox(
 id uuid PRIMARY KEY,journal_id uuid NOT NULL UNIQUE REFERENCES pay54_b54.journals(id),
 owner uuid NOT NULL,event_type text NOT NULL
);
INSERT INTO pay54_b54.sessions VALUES
 ('b5400000-0000-4000-8000-000000000001','b5400000-0000-4000-8000-000000000011','ACTIVE',1),
 ('b5400000-0000-4000-8000-000000000002','b5400000-0000-4000-8000-000000000022','ACTIVE',1);
INSERT INTO pay54_b54.accounts VALUES
 ('b5400000-0000-4000-8000-000000000101','b5400000-0000-4000-8000-000000000011','GBP'),
 ('b5400000-0000-4000-8000-000000000102','b5400000-0000-4000-8000-000000000011','GBP'),
 ('b5400000-0000-4000-8000-000000000103','b5400000-0000-4000-8000-000000000011','GBP'),
 ('b5400000-0000-4000-8000-000000000201','b5400000-0000-4000-8000-000000000022','GBP');
-- Synthetic funding: +10000 source/-10000 clearing, explicitly balanced.
INSERT INTO pay54_b54.journals VALUES
 ('b5400000-0000-4000-8000-000000000301',
  'b5400000-0000-4000-8000-000000000011',
  'batch54-synthetic-funding-0001',repeat('f',64));
INSERT INTO pay54_b54.entries VALUES
 (gen_random_uuid(),'b5400000-0000-4000-8000-000000000301',
  'b5400000-0000-4000-8000-000000000101',
  'b5400000-0000-4000-8000-000000000011',10000),
 (gen_random_uuid(),'b5400000-0000-4000-8000-000000000301',
  'b5400000-0000-4000-8000-000000000103',
  'b5400000-0000-4000-8000-000000000011',-10000);
REVOKE ALL ON ALL TABLES IN SCHEMA pay54_b54 FROM PUBLIC;
REVOKE ALL ON SCHEMA pay54_b54 FROM PUBLIC;
GRANT USAGE ON SCHEMA pay54_b54 TO pay54_b54_writer;
GRANT USAGE ON SCHEMA pay54 TO pay54_b54_writer; -- name resolution only
GRANT SELECT,UPDATE ON pay54_b54.sessions,pay54_b54.accounts TO pay54_b54_writer;
GRANT SELECT,INSERT ON pay54_b54.journals,pay54_b54.entries,pay54_b54.outbox
 TO pay54_b54_writer;
-- FORCE RLS, including when SQL runs as table owner; no bypass or broad policy.
ALTER TABLE pay54_b54.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54_b54.sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE pay54_b54.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54_b54.accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE pay54_b54.journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54_b54.journals FORCE ROW LEVEL SECURITY;
ALTER TABLE pay54_b54.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54_b54.entries FORCE ROW LEVEL SECURITY;
ALTER TABLE pay54_b54.outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54_b54.outbox FORCE ROW LEVEL SECURITY;
CREATE POLICY b54_sessions ON pay54_b54.sessions FOR ALL TO pay54_b54_writer
 USING(principal='b5400000-0000-4000-8000-000000000011')
 WITH CHECK(principal='b5400000-0000-4000-8000-000000000011');
CREATE POLICY b54_accounts ON pay54_b54.accounts FOR ALL TO pay54_b54_writer
 USING(owner='b5400000-0000-4000-8000-000000000011')
 WITH CHECK(owner='b5400000-0000-4000-8000-000000000011');
CREATE POLICY b54_journals ON pay54_b54.journals FOR ALL TO pay54_b54_writer
 USING(owner='b5400000-0000-4000-8000-000000000011')
 WITH CHECK(owner='b5400000-0000-4000-8000-000000000011');
CREATE POLICY b54_entries ON pay54_b54.entries FOR ALL TO pay54_b54_writer
 USING(owner='b5400000-0000-4000-8000-000000000011')
 WITH CHECK(owner='b5400000-0000-4000-8000-000000000011');
CREATE POLICY b54_outbox ON pay54_b54.outbox FOR ALL TO pay54_b54_writer
 USING(owner='b5400000-0000-4000-8000-000000000011')
 WITH CHECK(owner='b5400000-0000-4000-8000-000000000011');
CREATE FUNCTION pay54_b54.execute_synthetic_transfer(
 p_session uuid,p_source uuid,p_destination uuid,p_amount bigint,
 p_idempotency text,p_digest text
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pay54_b54
AS $fn$
DECLARE v_owner uuid;v_balance numeric;v_journal uuid;v_digest text;v_count integer;
BEGIN
 IF p_session IS NULL OR p_source IS NULL OR p_destination IS NULL
 OR p_source=p_destination OR p_amount IS NULL OR p_amount<=0
 OR p_idempotency !~ '^[a-z0-9-]{16,80}$'
 OR p_digest !~ '^[a-f0-9]{64}$'
 THEN RAISE EXCEPTION 'PAY54_B54_INVALID_COMMAND' USING ERRCODE='P5450'; END IF;
 -- This lock is retained through journal, entries and outbox creation.
 -- Revocation must use the SAME row lock protocol.
 SELECT principal INTO v_owner FROM pay54_b54.sessions
 WHERE id=p_session AND status='ACTIVE' AND version=1 FOR UPDATE;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'PAY54_B54_SESSION_REVOKED' USING ERRCODE='P5451'; END IF;
 IF (SELECT count(*) FROM pay54_b54.accounts
     WHERE id IN(p_source,p_destination) AND owner=v_owner AND currency='GBP')<>2
 THEN RAISE EXCEPTION 'PAY54_B54_WRONG_OWNER' USING ERRCODE='P5452'; END IF;
 PERFORM id FROM pay54_b54.accounts
 WHERE id IN(p_source,p_destination) ORDER BY id FOR UPDATE;
 SELECT id,digest INTO v_journal,v_digest FROM pay54_b54.journals
 WHERE owner=v_owner AND idempotency_key=p_idempotency FOR UPDATE;
 IF FOUND THEN
  IF v_digest<>p_digest THEN
   RAISE EXCEPTION 'PAY54_B54_REPLAY_DIGEST_MISMATCH' USING ERRCODE='P5454'; END IF;
  RETURN v_journal;
 END IF;
 SELECT COALESCE(sum(amount_minor::numeric),0) INTO v_balance
 FROM pay54_b54.entries WHERE account_id=p_source AND owner=v_owner;
 IF v_balance<p_amount THEN
  RAISE EXCEPTION 'PAY54_B54_INSUFFICIENT_FUNDS' USING ERRCODE='P5453'; END IF;
 v_journal=gen_random_uuid();
 INSERT INTO pay54_b54.journals VALUES(v_journal,v_owner,p_idempotency,p_digest);
 INSERT INTO pay54_b54.entries VALUES
 (gen_random_uuid(),v_journal,p_source,v_owner,-p_amount),
 (gen_random_uuid(),v_journal,p_destination,v_owner,p_amount);
 INSERT INTO pay54_b54.outbox VALUES
 (gen_random_uuid(),v_journal,v_owner,'synthetic.transfer.posted.v1');
 RETURN v_journal;
END $fn$;
REVOKE ALL ON FUNCTION pay54_b54.execute_synthetic_transfer(
 uuid,uuid,uuid,bigint,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pay54_b54.execute_synthetic_transfer(
 uuid,uuid,uuid,bigint,text,text) TO pay54_b54_writer;
SET LOCAL ROLE pay54_b54_writer;
DO $check$
DECLARE
 v_journal uuid;v_replay uuid;v_error boolean;
 v_source constant uuid:='b5400000-0000-4000-8000-000000000101';
 v_dest constant uuid:='b5400000-0000-4000-8000-000000000102';
 v_session constant uuid:='b5400000-0000-4000-8000-000000000001';
BEGIN
 IF current_user<>'pay54_b54_writer'
 OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user
 AND (rolcanlogin OR rolsuper OR rolbypassrls))
 THEN RAISE EXCEPTION 'PAY54_B54_UNSAFE_WRITER_IDENTITY'; END IF;
 IF (SELECT count(*) FROM pay54_b54.sessions)<>1
 OR (SELECT count(*) FROM pay54_b54.accounts)<>3
 THEN RAISE EXCEPTION 'PAY54_B54_FOREIGN_OWNER_VISIBLE'; END IF;
 IF has_function_privilege(current_user,
   'pay54.reserve_wallet_transfer(uuid,uuid,uuid,bigint,text,text,timestamp with time zone)',
   'EXECUTE')
 OR has_table_privilege(current_user,'pay54.ledger_entries','INSERT')
 OR has_table_privilege(current_user,'pay54.balance_reservations','UPDATE')
 THEN RAISE EXCEPTION 'PAY54_B54_CANONICAL_FINANCIAL_PRIVILEGE_LEAK'; END IF;
 v_journal=pay54_b54.execute_synthetic_transfer(
  v_session,v_source,v_dest,2500,'batch54-posting-key-0001',repeat('a',64));
 v_replay=pay54_b54.execute_synthetic_transfer(
  v_session,v_source,v_dest,2500,'batch54-posting-key-0001',repeat('a',64));
 IF v_journal IS NULL OR v_replay IS DISTINCT FROM v_journal
 OR (SELECT count(*) FROM pay54_b54.journals WHERE id=v_journal)<>1
 OR (SELECT count(*) FROM pay54_b54.entries WHERE journal_id=v_journal)<>2
 OR (SELECT coalesce(sum(amount_minor::numeric),0) FROM pay54_b54.entries
     WHERE journal_id=v_journal)<>0
 OR (SELECT count(*) FROM pay54_b54.outbox WHERE journal_id=v_journal)<>1
 OR (SELECT coalesce(sum(amount_minor::numeric),0) FROM pay54_b54.entries
     WHERE account_id=v_source)<>7500
 OR (SELECT coalesce(sum(amount_minor::numeric),0) FROM pay54_b54.entries
     WHERE account_id=v_dest)<>2500
 THEN RAISE EXCEPTION 'PAY54_B54_LEDGER_OR_OUTBOX_INVARIANT_FAILED'; END IF;
 v_error=false;
 BEGIN
 PERFORM pay54_b54.execute_synthetic_transfer(
  v_session,v_source,v_dest,2500,'batch54-posting-key-0001',repeat('b',64));
 EXCEPTION WHEN SQLSTATE 'P5454' THEN v_error=true; END;
 IF NOT v_error THEN RAISE EXCEPTION 'PAY54_B54_CONFLICTING_REPLAY_ACCEPTED'; END IF;
 v_error=false;
 BEGIN
 PERFORM pay54_b54.execute_synthetic_transfer(
  v_session,v_source,'b5400000-0000-4000-8000-000000000201',100,
  'batch54-foreign-key-0001',repeat('c',64));
 EXCEPTION WHEN SQLSTATE 'P5452' THEN v_error=true; END;
 IF NOT v_error THEN RAISE EXCEPTION 'PAY54_B54_FOREIGN_ACCOUNT_ACCEPTED'; END IF;
 v_error=false;
 BEGIN
 PERFORM pay54_b54.execute_synthetic_transfer(
  v_session,v_source,v_dest,7501,'batch54-overspend-0001',repeat('d',64));
 EXCEPTION WHEN SQLSTATE 'P5453' THEN v_error=true; END;
 IF NOT v_error THEN RAISE EXCEPTION 'PAY54_B54_OVERSPEND_ACCEPTED'; END IF;
 RAISE NOTICE 'PAY54_B54_PASS: restricted synthetic writer, session lock, balanced journal, outbox, replay/foreign/overspend denial';
END $check$;
RESET ROLE;
-- Revoker obtains the same session-row UPDATE lock used by the writer.
UPDATE pay54_b54.sessions SET status='REVOKED',version=2
 WHERE id='b5400000-0000-4000-8000-000000000001';
SET LOCAL ROLE pay54_b54_writer;
DO $revoked$
DECLARE rejected boolean:=false;
BEGIN
 BEGIN
  PERFORM pay54_b54.execute_synthetic_transfer(
   'b5400000-0000-4000-8000-000000000001',
   'b5400000-0000-4000-8000-000000000101',
   'b5400000-0000-4000-8000-000000000102',
   100,'batch54-revoked-key-0001',repeat('e',64));
 EXCEPTION WHEN SQLSTATE 'P5451' THEN rejected=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'PAY54_B54_REVOKED_SESSION_ACCEPTED'; END IF;
 RAISE NOTICE 'PAY54_B54_PASS: revoked session refused by restricted writer';
END $revoked$;
RESET ROLE;
ROLLBACK;
DO $clean$
BEGIN
 IF to_regnamespace('pay54_b54') IS NOT NULL
 OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='pay54_b54_writer')
 THEN RAISE EXCEPTION 'PAY54_B54_ROLLBACK_FAILED'; END IF;
 RAISE NOTICE 'PAY54_B54_PASS: isolated schema/role and all synthetic postings rolled back';
END $clean$;
