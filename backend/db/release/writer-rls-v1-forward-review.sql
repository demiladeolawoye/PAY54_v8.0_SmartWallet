-- PAY54 Wave9 — REVIEW-ONLY financial writer RLS boundary candidate.
-- Disposable PostgreSQL 16 ONLY; never a deployable authorisation.
-- Creates NO LOGIN, NO financial ACL, NO EXECUTE, NO financial write policy.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='25s';
DO $preflight$
DECLARE r record; n integer;
BEGIN
 IF current_database()<>'pay54_disposable_ci'
 OR session_user<>'postgres' OR current_user<>'postgres'
 OR to_regprocedure('pay54.wallet_read_restricted_v1(bytea,uuid,uuid,character varying)') IS NULL
 OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN
 ('pay54_writer9_owner_candidate','pay54_writer9_caller_candidate'))
 THEN RAISE EXCEPTION 'PAY54_W9_DISPOSABLE_ONLY_OR_ROLE_COLLISION'; END IF;
 FOR r IN SELECT c.relname
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='pay54' AND c.relname IN
 ('wallets','ledger_accounts','ledger_entries','ledger_journals','balance_reservations')
 AND c.relkind='r' AND c.relrowsecurity AND c.relforcerowsecurity LOOP
  n:=coalesce(n,0)+1;
 END LOOP;
 IF coalesce(n,0)<>5 THEN RAISE EXCEPTION 'PAY54_W9_REQUIRED_FORCE_RLS_NOT_FOUND'; END IF;
 IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='pay54'
 AND tablename IN ('wallets','ledger_accounts','ledger_entries','ledger_journals','balance_reservations')
 AND cmd IN ('ALL','INSERT','UPDATE','DELETE') AND 'public'=ANY(roles))
 THEN RAISE EXCEPTION 'PAY54_W9_PUBLIC_FINANCIAL_WRITE_POLICY'; END IF;
END $preflight$;

CREATE ROLE pay54_writer9_owner_candidate NOLOGIN NOINHERIT NOSUPERUSER
 NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE ROLE pay54_writer9_caller_candidate NOLOGIN NOINHERIT NOSUPERUSER
 NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;

-- Restrictive denial is not an activation policy. Even if future permissive
-- policies appear, the candidate role still cannot read or mutate rows.
CREATE POLICY pay54_w9_deny_wallets ON pay54.wallets
 AS RESTRICTIVE FOR ALL TO pay54_writer9_owner_candidate USING (false) WITH CHECK (false);
CREATE POLICY pay54_w9_deny_accounts ON pay54.ledger_accounts
 AS RESTRICTIVE FOR ALL TO pay54_writer9_owner_candidate USING (false) WITH CHECK (false);
CREATE POLICY pay54_w9_deny_entries ON pay54.ledger_entries
 AS RESTRICTIVE FOR ALL TO pay54_writer9_owner_candidate USING (false) WITH CHECK (false);
CREATE POLICY pay54_w9_deny_journals ON pay54.ledger_journals
 AS RESTRICTIVE FOR ALL TO pay54_writer9_owner_candidate USING (false) WITH CHECK (false);
CREATE POLICY pay54_w9_deny_holds ON pay54.balance_reservations
 AS RESTRICTIVE FOR ALL TO pay54_writer9_owner_candidate USING (false) WITH CHECK (false);

DO $verify$
DECLARE r record; n integer;
BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN
 ('pay54_writer9_owner_candidate','pay54_writer9_caller_candidate') LOOP
  IF (SELECT rolcanlogin OR rolsuper OR rolbypassrls OR rolinherit OR rolcreaterole
   FROM pg_roles WHERE rolname=r.rolname)
  OR EXISTS (SELECT 1 FROM pg_auth_members m
    JOIN pg_roles p ON m.roleid=p.oid OR m.member=p.oid WHERE p.rolname=r.rolname)
  OR has_schema_privilege(r.rolname,'pay54','CREATE')
  OR has_table_privilege(r.rolname,'pay54.ledger_entries','SELECT')
  OR has_table_privilege(r.rolname,'pay54.ledger_entries','INSERT')
  OR has_table_privilege(r.rolname,'pay54.financial_operations','UPDATE')
  OR has_table_privilege(r.rolname,'pay54.balance_reservations','UPDATE')
  OR has_function_privilege(r.rolname,
  'pay54.reserve_wallet_transfer(uuid,uuid,uuid,bigint,text,text,timestamp with time zone)','EXECUTE')
  OR has_function_privilege(r.rolname,
  'pay54.capture_reserved_wallet_transfer(uuid,uuid)','EXECUTE')
  OR has_function_privilege(r.rolname,
  'pay54.release_reserved_wallet_transfer(uuid,uuid,text)','EXECUTE')
  THEN RAISE EXCEPTION 'PAY54_W9_UNEXPECTED_ROLE_AUTHORITY: %',r.rolname; END IF;
 END LOOP;
 SELECT count(*) INTO n FROM pg_policies WHERE schemaname='pay54'
  AND policyname LIKE 'pay54_w9_deny_%' AND permissive='RESTRICTIVE'
  AND cmd='ALL' AND roles=ARRAY['pay54_writer9_owner_candidate']::name[];
 IF n<>5 THEN RAISE EXCEPTION 'PAY54_W9_POLICY_MATRIX_MISMATCH: %',n; END IF;
 IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='pay54'
  AND policyname LIKE 'pay54_w9_deny_%'
  AND (qual<>'false' OR with_check<>'false'))
 THEN RAISE EXCEPTION 'PAY54_W9_POLICY_NOT_FAIL_CLOSED'; END IF;
END $verify$;
COMMIT;
\echo PAY54_W9_FORWARD_DENY_ONLY_PASS
