-- PAY54 Batch 08 / disposable DB actor spoofing proof.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout='30s';
CREATE ROLE pay54_ci_adversary NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
CREATE SCHEMA pay54_ci_spoof;
CREATE TABLE pay54_ci_spoof.restricted (db_actor text, secret text);
INSERT INTO pay54_ci_spoof.restricted VALUES ('pay54_ci_owner','protected');
ALTER TABLE pay54_ci_spoof.restricted ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54_ci_spoof.restricted FORCE ROW LEVEL SECURITY;
CREATE POLICY pay54_ci_unspoofable ON pay54_ci_spoof.restricted
 FOR SELECT TO PUBLIC USING (db_actor=current_user);
GRANT USAGE ON SCHEMA pay54_ci_spoof TO pay54_ci_adversary;
GRANT SELECT ON pay54_ci_spoof.restricted TO pay54_ci_adversary;
SET ROLE pay54_ci_adversary;
SELECT set_config('pay54.subject','pay54_ci_owner',true);
DO $$
BEGIN
 IF (SELECT count(*) FROM pay54_ci_spoof.restricted)<>0 THEN
  RAISE EXCEPTION 'Custom GUC spoofed authenticated database actor'; END IF;
 IF current_user<>'pay54_ci_adversary' THEN
  RAISE EXCEPTION 'Database role identity unexpectedly changed'; END IF;
END;
$$;
RESET ROLE;
ROLLBACK;
DO $$
BEGIN
 IF to_regclass('pay54_ci_spoof.restricted') IS NOT NULL
 OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='pay54_ci_adversary')
 THEN RAISE EXCEPTION 'Spoof-test temporary objects survived'; END IF;
 RAISE NOTICE 'PASS: SQL-settable subject value does not override current_user';
END;
$$;
