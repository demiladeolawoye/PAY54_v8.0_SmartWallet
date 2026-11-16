-- PAY54 Batch 10 implementation 236 — simulated session user trust boundary.
-- Test-only roles, schema and relation; never create real customer privileges.
-- A privileged shared PostgreSQL login is NOT a validated tenant login merely
-- because it can SET ROLE to a tenant. Every test-owned artefact is rolled back.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout='30s';
SET LOCAL lock_timeout='5s';

CREATE ROLE pay54_ci_batch10_alpha NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
CREATE ROLE pay54_ci_batch10_beta NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
CREATE SCHEMA pay54_ci_batch10;
CREATE TABLE pay54_ci_batch10.labels(
  id integer PRIMARY KEY,
  actor_role name NOT NULL,
  private_label text NOT NULL
);
INSERT INTO pay54_ci_batch10.labels VALUES
  (1,'pay54_ci_batch10_alpha','alpha-test-label'),
  (2,'pay54_ci_batch10_beta','beta-test-label');
ALTER TABLE pay54_ci_batch10.labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54_ci_batch10.labels FORCE ROW LEVEL SECURITY;
CREATE POLICY pay54_ci_batch10_actor_only ON pay54_ci_batch10.labels
  FOR SELECT TO PUBLIC USING (actor_role=current_user);
GRANT USAGE ON SCHEMA pay54_ci_batch10
  TO pay54_ci_batch10_alpha,pay54_ci_batch10_beta;
GRANT SELECT ON pay54_ci_batch10.labels
  TO pay54_ci_batch10_alpha,pay54_ci_batch10_beta;

-- An admin session may SET ROLE, but the session_user remains the real login.
SET ROLE pay54_ci_batch10_alpha;
DO $$
BEGIN
  IF current_user <> 'pay54_ci_batch10_alpha'
     OR session_user = current_user THEN
    RAISE EXCEPTION 'Privileged role-switch did not preserve original session identity';
  END IF;
  IF (SELECT count(*) FROM pay54_ci_batch10.labels) <> 1
     OR (SELECT min(private_label) FROM pay54_ci_batch10.labels) <> 'alpha-test-label' THEN
    RAISE EXCEPTION 'Synthetic tenant RLS isolation failed for alpha';
  END IF;
END
$$;
RESET ROLE;

SET ROLE pay54_ci_batch10_beta;
DO $$
BEGIN
  IF current_user <> 'pay54_ci_batch10_beta'
     OR session_user = current_user THEN
    RAISE EXCEPTION 'Role-switch remained invisible to role attestation';
  END IF;
  IF (SELECT count(*) FROM pay54_ci_batch10.labels) <> 1
     OR (SELECT min(private_label) FROM pay54_ci_batch10.labels) <> 'beta-test-label' THEN
    RAISE EXCEPTION 'Synthetic tenant RLS isolation failed for beta';
  END IF;
END
$$;
RESET ROLE;
ROLLBACK;
