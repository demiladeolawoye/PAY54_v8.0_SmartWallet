-- PAY54 Batch 09 — identity settings and role-membership attacks (test-only).
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout='30s';
CREATE ROLE pay54_ci_actor_attack NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
CREATE ROLE pay54_ci_actor_target NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
CREATE SCHEMA pay54_ci_attack;
CREATE TABLE pay54_ci_attack.protected (role_name text, confidential text);
INSERT INTO pay54_ci_attack.protected VALUES ('pay54_ci_actor_target','target-private');
ALTER TABLE pay54_ci_attack.protected ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54_ci_attack.protected FORCE ROW LEVEL SECURITY;
CREATE POLICY pay54_ci_actor_only ON pay54_ci_attack.protected
 FOR SELECT TO PUBLIC USING (role_name=current_user);
GRANT USAGE ON SCHEMA pay54_ci_attack TO pay54_ci_actor_attack;
GRANT SELECT ON pay54_ci_attack.protected TO pay54_ci_actor_attack;

SET ROLE pay54_ci_actor_attack;
SELECT set_config('pay54.subject','pay54_ci_actor_target',true);
DO $$
BEGIN
 IF current_user <> 'pay54_ci_actor_attack' OR
   (SELECT count(*) FROM pay54_ci_attack.protected)<>0 THEN
  RAISE EXCEPTION 'Spoofed SQL setting bypassed role ACL'; END IF;
 IF pg_has_role('pay54_ci_actor_attack','pay54_ci_actor_target','MEMBER') THEN
  RAISE EXCEPTION 'Tenant role acquired unintended membership'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
