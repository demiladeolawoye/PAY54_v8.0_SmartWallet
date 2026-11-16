-- PAY54 Batch 10 implementation 237 — caller-settable GUC spoofing denial.
-- Distinct disposable objects and NOLOGIN actors; no PAY54 customer grants.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout='30s';
CREATE ROLE pay54_ci_batch10_attacker NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
CREATE ROLE pay54_ci_batch10_target NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
CREATE SCHEMA pay54_ci_batch10_spoof;
CREATE TABLE pay54_ci_batch10_spoof.protected(
  actor_role name NOT NULL,
  secret text NOT NULL
);
INSERT INTO pay54_ci_batch10_spoof.protected
  VALUES ('pay54_ci_batch10_target','target-synthetic-only');
ALTER TABLE pay54_ci_batch10_spoof.protected ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54_ci_batch10_spoof.protected FORCE ROW LEVEL SECURITY;
CREATE POLICY pay54_ci_batch10_spoof_deny
 ON pay54_ci_batch10_spoof.protected
 FOR SELECT TO PUBLIC USING (actor_role=current_user);
GRANT USAGE ON SCHEMA pay54_ci_batch10_spoof TO pay54_ci_batch10_attacker;
GRANT SELECT ON pay54_ci_batch10_spoof.protected TO pay54_ci_batch10_attacker;

SET ROLE pay54_ci_batch10_attacker;
SELECT set_config('pay54.actor','pay54_ci_batch10_target',true);
SELECT set_config('pay54.tenant_id','pay54_ci_batch10_target',true);
DO $$
BEGIN
 IF current_setting('pay54.actor') <> 'pay54_ci_batch10_target' THEN
  RAISE EXCEPTION 'Spoof preparation failed';
 END IF;
 IF (SELECT count(*) FROM pay54_ci_batch10_spoof.protected) <> 0 THEN
  RAISE EXCEPTION 'A caller-controlled SQL variable bypassed tenant RLS';
 END IF;
 IF current_user <> 'pay54_ci_batch10_attacker' THEN
  RAISE EXCEPTION 'SQL variable changed authenticated actor';
 END IF;
END
$$;
RESET ROLE;
ROLLBACK;
