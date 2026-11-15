-- PAY54 Batch 06 / disposable PostgreSQL 16 RLS denial and privilege tests.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $$
DECLARE entry RECORD;
BEGIN
 FOR entry IN
 SELECT c.oid, c.relname, p.polname, p.polpermissive, p.polqual, p.polroles
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 JOIN pg_policy p ON p.polrelid=c.oid
 WHERE n.nspname='pay54' AND p.polname IN
 ('pay54_reader_account_deny','pay54_reader_membership_deny','pay54_reader_wallet_binding_deny')
 LOOP
  IF entry.polpermissive OR
     pg_get_expr(entry.polqual,entry.oid) <> 'false' OR
     NOT (SELECT oid=ANY(entry.polroles) FROM pg_roles
       WHERE rolname='pay54_account_reader_role') THEN
    RAISE EXCEPTION 'Insecure RLS policy % on %',entry.polname,entry.relname;
  END IF;
 END LOOP;
 IF (SELECT count(*) FROM pg_policy WHERE polname IN
 ('pay54_reader_account_deny','pay54_reader_membership_deny','pay54_reader_wallet_binding_deny')) <> 3
 THEN RAISE EXCEPTION 'Missing required restrictive account deny policies'; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='pay54_account_reader_role'
 AND (rolcanlogin OR rolbypassrls OR rolsuper)) THEN
 RAISE EXCEPTION 'Reader role gained login or RLS bypass'; END IF;
 FOREACH entry IN ARRAY ARRAY[]::record[] LOOP NULL; END LOOP;
 IF has_table_privilege('pay54_account_reader_role','pay54.account_contexts','SELECT') OR
 has_table_privilege('pay54_account_reader_role','pay54.account_memberships','SELECT') OR
 has_table_privilege('pay54_account_reader_role','pay54.personal_wallet_bindings','SELECT') OR
 has_table_privilege('pay54_account_reader_role','pay54.wallets','SELECT') THEN
 RAISE EXCEPTION 'Account reader gained data privileges'; END IF;
 RAISE NOTICE 'PASS: restrictive deny policies and ungranted reader role';
END;
$$;
ROLLBACK;
