-- PAY54 Batch55, disposable CI ONLY: committed synthetic fixture required for two physical connections.
-- Authenticated customer funds and canonical PAY54 ledger are never accessed.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout='35s';
SET LOCAL lock_timeout='5s';
DO $pre$
BEGIN
 IF current_database()<>'pay54_disposable_ci'
 OR session_user<>'postgres' OR current_user<>'postgres'
 OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='pay54_b55_writer')
 OR to_regnamespace('pay54_b55') IS NOT NULL
 THEN RAISE EXCEPTION 'PAY54_B55_DISPOSABLE_PRECONDITION_DENIED'; END IF;
END $pre$;
CREATE ROLE pay54_b55_writer NOLOGIN NOINHERIT NOSUPERUSER
 NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE SCHEMA pay54_b55;
CREATE TABLE pay54_b55.sessions(
 id uuid PRIMARY KEY,principal uuid NOT NULL,status text NOT NULL
 CHECK(status IN ('ACTIVE','REVOKED')),version integer NOT NULL CHECK(version>0)
);
CREATE TABLE pay54_b55.accounts(
 id uuid PRIMARY KEY,owner uuid NOT NULL,currency char(3) NOT NULL
);
CREATE TABLE pay54_b55.journals(
 id uuid PRIMARY KEY,owner uuid NOT NULL,idempotency_key text NOT NULL,
 digest text NOT NULL CHECK(digest ~ '^[a-f0-9]{64}$'),
 UNIQUE(owner,idempotency_key)
);
CREATE TABLE pay54_b55.entries(
 id uuid PRIMARY KEY, journal_id uuid NOT NULL REFERENCES pay54_b55.journals(id),
 account_id uuid NOT NULL REFERENCES pay54_b55.accounts(id),
 owner uuid NOT NULL,amount_minor bigint NOT NULL CHECK(amount_minor<>0)
);
CREATE TABLE pay54_b55.outbox(
 id uuid PRIMARY KEY,journal_id uuid NOT NULL UNIQUE REFERENCES pay54_b55.journals(id),
 owner uuid NOT NULL,event_type text NOT NULL
);
INSERT INTO pay54_b55.sessions VALUES
 ('b5500000-0000-4000-8000-000000000001','b5500000-0000-4000-8000-000000000011','ACTIVE',1),
 ('b5500000-0000-4000-8000-000000000002','b5500000-0000-4000-8000-000000000022','ACTIVE',1);
INSERT INTO pay54_b55.accounts VALUES
 ('b5500000-0000-4000-8000-000000000101','b5500000-0000-4000-8000-000000000011','GBP'),
 ('b5500000-0000-4000-8000-000000000102','b5500000-0000-4000-8000-000000000011','GBP'),
 ('b5500000-0000-4000-8000-000000000103','b5500000-0000-4000-8000-000000000011','GBP'),
 ('b5500000-0000-4000-8000-000000000201','b5500000-0000-4000-8000-000000000022','GBP');
-- Synthetic funding: +10000 source/-10000 clearing, explicitly balanced.
INSERT INTO pay54_b55.journals VALUES
 ('b5500000-0000-4000-8000-000000000301',
  'b5500000-0000-4000-8000-000000000011',
  'batch54-synthetic-funding-0001',repeat('f',64));
INSERT INTO pay54_b55.entries VALUES
 (gen_random_uuid(),'b5500000-0000-4000-8000-000000000301',
  'b5500000-0000-4000-8000-000000000101',
  'b5500000-0000-4000-8000-000000000011',10000),
 (gen_random_uuid(),'b5500000-0000-4000-8000-000000000301',
  'b5500000-0000-4000-8000-000000000103',
  'b5500000-0000-4000-8000-000000000011',-10000);
INSERT INTO pay54_b55.sessions VALUES
 ('b5500000-0000-4000-8000-000000000002',
  'b5500000-0000-4000-8000-000000000011','ACTIVE',1);
REVOKE ALL ON ALL TABLES IN SCHEMA pay54_b55 FROM PUBLIC;
REVOKE ALL ON SCHEMA pay54_b55 FROM PUBLIC;
GRANT USAGE ON SCHEMA pay54_b55 TO pay54_b55_writer;
GRANT USAGE ON SCHEMA pay54 TO pay54_b55_writer; -- name resolution only
GRANT SELECT,UPDATE ON pay54_b55.sessions,pay54_b55.accounts TO pay54_b55_writer;
GRANT SELECT,INSERT ON pay54_b55.journals,pay54_b55.entries,pay54_b55.outbox
 TO pay54_b55_writer;
-- FORCE RLS, including when SQL runs as table owner; no bypass or broad policy.
ALTER TABLE pay54_b55.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54_b55.sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE pay54_b55.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54_b55.accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE pay54_b55.journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54_b55.journals FORCE ROW LEVEL SECURITY;
ALTER TABLE pay54_b55.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54_b55.entries FORCE ROW LEVEL SECURITY;
ALTER TABLE pay54_b55.outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54_b55.outbox FORCE ROW LEVEL SECURITY;
CREATE POLICY b55_sessions ON pay54_b55.sessions FOR ALL TO pay54_b55_writer
 USING(principal='b5500000-0000-4000-8000-000000000011')
 WITH CHECK(principal='b5500000-0000-4000-8000-000000000011');
CREATE POLICY b55_accounts ON pay54_b55.accounts FOR ALL TO pay54_b55_writer
 USING(owner='b5500000-0000-4000-8000-000000000011')
 WITH CHECK(owner='b5500000-0000-4000-8000-000000000011');
CREATE POLICY b55_journals ON pay54_b55.journals FOR ALL TO pay54_b55_writer
 USING(owner='b5500000-0000-4000-8000-000000000011')
 WITH CHECK(owner='b5500000-0000-4000-8000-000000000011');
CREATE POLICY b55_entries ON pay54_b55.entries FOR ALL TO pay54_b55_writer
 USING(owner='b5500000-0000-4000-8000-000000000011')
 WITH CHECK(owner='b5500000-0000-4000-8000-000000000011');
CREATE POLICY b55_outbox ON pay54_b55.outbox FOR ALL TO pay54_b55_writer
 USING(owner='b5500000-0000-4000-8000-000000000011')
 WITH CHECK(owner='b5500000-0000-4000-8000-000000000011');
CREATE FUNCTION pay54_b55.execute_synthetic_transfer(
 p_session uuid,p_source uuid,p_destination uuid,p_amount bigint,
 p_idempotency text,p_digest text
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pay54_b55
AS $fn$
DECLARE v_owner uuid;v_balance numeric;v_journal uuid;v_digest text;v_count integer;
BEGIN
 IF p_session IS NULL OR p_source IS NULL OR p_destination IS NULL
 OR p_source=p_destination OR p_amount IS NULL OR p_amount<=0
 OR p_idempotency !~ '^[a-z0-9-]{16,80}$'
 OR p_digest !~ '^[a-f0-9]{64}$'
 THEN RAISE EXCEPTION 'PAY54_B55_INVALID_COMMAND' USING ERRCODE='P5450'; END IF;
 -- This lock is retained through journal, entries and outbox creation.
 -- Revocation must use the SAME row lock protocol.
 SELECT principal INTO v_owner FROM pay54_b55.sessions
 WHERE id=p_session AND status='ACTIVE' AND version=1 FOR UPDATE;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'PAY54_B55_SESSION_REVOKED' USING ERRCODE='P5451'; END IF;
 IF (SELECT count(*) FROM pay54_b55.accounts
     WHERE id IN(p_source,p_destination) AND owner=v_owner AND currency='GBP')<>2
 THEN RAISE EXCEPTION 'PAY54_B55_WRONG_OWNER' USING ERRCODE='P5452'; END IF;
 PERFORM id FROM pay54_b55.accounts
 WHERE id IN(p_source,p_destination) ORDER BY id FOR UPDATE;
 SELECT id,digest INTO v_journal,v_digest FROM pay54_b55.journals
 WHERE owner=v_owner AND idempotency_key=p_idempotency;
 -- Session and both financial account rows are already FOR UPDATE locked;
 -- the unique (owner,key) constraint remains the final replay safeguard.
 -- Avoid broadening journals UPDATE privilege just for replay lookup.
 IF FOUND THEN
  IF v_digest<>p_digest THEN
   RAISE EXCEPTION 'PAY54_B55_REPLAY_DIGEST_MISMATCH' USING ERRCODE='P5454'; END IF;
  RETURN v_journal;
 END IF;
 SELECT COALESCE(sum(amount_minor::numeric),0) INTO v_balance
 FROM pay54_b55.entries WHERE account_id=p_source AND owner=v_owner;
 IF v_balance<p_amount THEN
  RAISE EXCEPTION 'PAY54_B55_INSUFFICIENT_FUNDS' USING ERRCODE='P5453'; END IF;
 v_journal=gen_random_uuid();
 INSERT INTO pay54_b55.journals VALUES(v_journal,v_owner,p_idempotency,p_digest);
 INSERT INTO pay54_b55.entries VALUES
 (gen_random_uuid(),v_journal,p_source,v_owner,-p_amount),
 (gen_random_uuid(),v_journal,p_destination,v_owner,p_amount);
 INSERT INTO pay54_b55.outbox VALUES
 (gen_random_uuid(),v_journal,v_owner,'synthetic.transfer.posted.v1');
 RETURN v_journal;
END $fn$;
REVOKE ALL ON FUNCTION pay54_b55.execute_synthetic_transfer(
 uuid,uuid,uuid,bigint,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pay54_b55.execute_synthetic_transfer(
 uuid,uuid,uuid,bigint,text,text) TO pay54_b55_writer;
COMMIT;
