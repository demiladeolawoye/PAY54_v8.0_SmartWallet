-- PAY54 Batch 09 — ephemeral PostgreSQL role-based row ACL proof.
-- Standalone test-only objects; no account/financial table is granted.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
CREATE ROLE pay54_ci_actor_alpha NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
CREATE ROLE pay54_ci_actor_beta NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
CREATE SCHEMA pay54_ci_batch09;
CREATE TABLE pay54_ci_batch09.protected_account (
 id integer PRIMARY KEY, actor_role text NOT NULL, label text NOT NULL
);
INSERT INTO pay54_ci_batch09.protected_account VALUES
 (1,'pay54_ci_actor_alpha','alpha-only'),
 (2,'pay54_ci_actor_beta','beta-only');
ALTER TABLE pay54_ci_batch09.protected_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54_ci_batch09.protected_account FORCE ROW LEVEL SECURITY;
CREATE POLICY pay54_ci_allow_actor ON pay54_ci_batch09.protected_account
 FOR SELECT TO PUBLIC USING (actor_role=current_user);
GRANT USAGE ON SCHEMA pay54_ci_batch09 TO pay54_ci_actor_alpha, pay54_ci_actor_beta;
GRANT SELECT ON pay54_ci_batch09.protected_account TO pay54_ci_actor_alpha, pay54_ci_actor_beta;

SET ROLE pay54_ci_actor_alpha;
DO $$
BEGIN
 IF (SELECT count(*) FROM pay54_ci_batch09.protected_account)<>1 OR
    (SELECT label FROM pay54_ci_batch09.protected_account) <> 'alpha-only' THEN
    RAISE EXCEPTION 'Alpha role could see other tenant or missed own tenant'; END IF;
 IF current_user <> 'pay54_ci_actor_alpha' THEN
    RAISE EXCEPTION 'Alpha actor not established'; END IF;
END $$;
RESET ROLE;

SET ROLE pay54_ci_actor_beta;
DO $$
BEGIN
 IF (SELECT count(*) FROM pay54_ci_batch09.protected_account)<>1 OR
    (SELECT label FROM pay54_ci_batch09.protected_account) <> 'beta-only' THEN
    RAISE EXCEPTION 'Beta role could see other tenant or missed own tenant'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
