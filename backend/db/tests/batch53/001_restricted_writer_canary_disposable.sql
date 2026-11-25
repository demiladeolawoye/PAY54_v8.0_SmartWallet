-- PAY54 Batch53: POSITIVE non-superuser restricted-role SQL proof.
-- Synthetic isolated canary only; NO financial table mutations.
-- Executed only in disposable PostgreSQL 16, all changes rolled back.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout='25s';
SET LOCAL lock_timeout='5s';
DO $pre$
BEGIN
 IF current_database()<>'pay54_disposable_ci'
 OR session_user<>'postgres'
 OR current_user<>'postgres'
 OR to_regprocedure('pay54.reserve_wallet_transfer(uuid,uuid,uuid,bigint,text,text,timestamp with time zone)') IS NULL
 OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='pay54_b53_canary_writer')
 OR to_regnamespace('pay54_b53_canary') IS NOT NULL
 THEN RAISE EXCEPTION 'PAY54_B53_DISPOSABLE_PRECONDITION_DENIED'; END IF;
END $pre$;
CREATE ROLE pay54_b53_canary_writer NOLOGIN NOINHERIT NOSUPERUSER
 NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE SCHEMA pay54_b53_canary;
CREATE TABLE pay54_b53_canary.scoped_command (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL,
 status text NOT NULL CHECK(status IN ('QUEUED','ACCEPTED'))
);
INSERT INTO pay54_b53_canary.scoped_command(id,owner_id,status) VALUES
('b5300000-0000-4000-8000-000000000001','b5300000-0000-4000-8000-000000000011','QUEUED'),
('b5300000-0000-4000-8000-000000000002','b5300000-0000-4000-8000-000000000022','QUEUED');
ALTER TABLE pay54_b53_canary.scoped_command ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54_b53_canary.scoped_command FORCE ROW LEVEL SECURITY;
-- Hard-coded synthetic scope for this test ONLY; not an identity system.
CREATE POLICY pay54_b53_owner_canary ON pay54_b53_canary.scoped_command
 FOR ALL TO pay54_b53_canary_writer
 USING(owner_id='b5300000-0000-4000-8000-000000000011')
 WITH CHECK(owner_id='b5300000-0000-4000-8000-000000000011');
GRANT USAGE ON SCHEMA pay54_b53_canary TO pay54_b53_canary_writer;
GRANT SELECT,UPDATE ON pay54_b53_canary.scoped_command TO pay54_b53_canary_writer;
SET LOCAL ROLE pay54_b53_canary_writer;
DO $verify$
DECLARE affected integer;
DECLARE denied boolean:=false;
BEGIN
 IF current_user<>'pay54_b53_canary_writer'
 OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user
     AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls)
 THEN RAISE EXCEPTION 'PAY54_B53_NOT_REAL_RESTRICTED_ROLE'; END IF;
 IF (SELECT count(*) FROM pay54_b53_canary.scoped_command)<>1
 THEN RAISE EXCEPTION 'PAY54_B53_CROSS_OWNER_READ_VISIBLE'; END IF;
 UPDATE pay54_b53_canary.scoped_command SET status='ACCEPTED'
 WHERE id='b5300000-0000-4000-8000-000000000001'
 AND status='QUEUED';
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>1 THEN RAISE EXCEPTION 'PAY54_B53_POSITIVE_WRITE_FAILED'; END IF;
 UPDATE pay54_b53_canary.scoped_command SET status='ACCEPTED'
 WHERE id='b5300000-0000-4000-8000-000000000002';
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>0 THEN RAISE EXCEPTION 'PAY54_B53_FOREIGN_WRITE_ALLOWED'; END IF;
 BEGIN
   INSERT INTO pay54_b53_canary.scoped_command VALUES (
   'b5300000-0000-4000-8000-000000000003',
   'b5300000-0000-4000-8000-000000000011','QUEUED');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'PAY54_B53_INSERT_UNEXPECTEDLY_ALLOWED'; END IF;
 IF has_function_privilege(current_user,
  'pay54.reserve_wallet_transfer(uuid,uuid,uuid,bigint,text,text,timestamp with time zone)',
  'EXECUTE')
 OR has_function_privilege(current_user,
  'pay54.capture_reserved_wallet_transfer(uuid,uuid)','EXECUTE')
 OR has_table_privilege(current_user,'pay54.ledger_entries','INSERT')
 OR has_table_privilege(current_user,'pay54.balance_reservations','UPDATE')
 THEN RAISE EXCEPTION 'PAY54_B53_CANONICAL_MONEY_ACCESS_LEAK'; END IF;
 RAISE NOTICE 'PAY54_B53_PASS: real restricted-role scoped canary update, foreign denial, financial boundary';
END $verify$;
RESET ROLE;
DO $audit$
BEGIN
 IF (SELECT count(*) FROM pay54_b53_canary.scoped_command
 WHERE status='ACCEPTED'
 AND owner_id='b5300000-0000-4000-8000-000000000011')<>1
 OR (SELECT count(*) FROM pay54_b53_canary.scoped_command
 WHERE status='QUEUED'
 AND owner_id='b5300000-0000-4000-8000-000000000022')<>1
 THEN RAISE EXCEPTION 'PAY54_B53_POST_ROLE_STATE_INVALID'; END IF;
END $audit$;
ROLLBACK;
DO $clean$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='pay54_b53_canary_writer')
 OR to_regnamespace('pay54_b53_canary') IS NOT NULL
 THEN RAISE EXCEPTION 'PAY54_B53_CANARY_ROLLBACK_LEAK'; END IF;
 RAISE NOTICE 'PAY54_B53_PASS: all canary schema and role changes rolled back';
END $clean$;
