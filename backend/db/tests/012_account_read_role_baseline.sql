-- PAY54 BATCH 04 / role permission negative tests — disposable CI ONLY.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout='30s';
SET LOCAL lock_timeout='5s';

DO $$
DECLARE
 r RECORD;
BEGIN
 SELECT * INTO r FROM pg_roles WHERE rolname='pay54_account_reader_role';
 IF NOT FOUND OR r.rolcanlogin OR r.rolinherit OR r.rolsuper OR r.rolbypassrls
    OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication
 THEN RAISE EXCEPTION 'Account reader role has unsafe attributes'; END IF;
 IF EXISTS (SELECT 1 FROM pg_auth_members WHERE roleid=r.oid OR member=r.oid) THEN
   RAISE EXCEPTION 'Reader role has unapproved membership';
 END IF;
 IF NOT has_schema_privilege(r.rolname,'pay54','USAGE') THEN
   RAISE EXCEPTION 'Reader lacks harmless schema name resolution';
 END IF;
END;
$$;

CREATE FUNCTION pg_temp.deny_account_read()
RETURNS void LANGUAGE plpgsql SECURITY INVOKER
AS $$
DECLARE
 stmt TEXT;
 denied BOOLEAN;
 checks INTEGER:=0;
BEGIN
 FOREACH stmt IN ARRAY ARRAY[
   'SELECT id FROM pay54.account_contexts LIMIT 1',
   'SELECT account_id FROM pay54.account_memberships LIMIT 1',
   'SELECT wallet_id FROM pay54.personal_wallet_bindings LIMIT 1',
   'SELECT wallet_id FROM pay54.eligible_personal_wallet_bindings LIMIT 1',
   'SELECT id FROM pay54.wallets LIMIT 1',
   'SELECT id FROM pay54.ledger_entries LIMIT 1',
   'SELECT id FROM pay54.financial_operations LIMIT 1',
   'INSERT INTO pay54.account_contexts(legal_owner_subject,account_type,display_name) VALUES(gen_random_uuid(),''PERSONAL'',''Unapproved'')',
   'UPDATE pay54.account_contexts SET display_name=''Other'' WHERE FALSE',
   'DELETE FROM pay54.account_memberships WHERE FALSE',
   'SELECT * FROM pay54.capture_reserved_wallet_transfer(gen_random_uuid(),gen_random_uuid())'
 ] LOOP
   denied:=false;
   BEGIN EXECUTE stmt;
   EXCEPTION WHEN insufficient_privilege THEN denied:=true;
   END;
   IF NOT denied THEN
     RAISE EXCEPTION 'FAIL: account reader executed prohibited SQL: %', stmt;
   END IF;
   checks:=checks+1;
 END LOOP;
 IF checks<>11 THEN RAISE EXCEPTION 'Expected eleven negative checks'; END IF;
END;
$$;

SET ROLE pay54_account_reader_role;
SELECT pg_temp.deny_account_read();
RESET ROLE;

DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM pay54.account_contexts)
   OR EXISTS(SELECT 1 FROM pay54.wallets)
   OR EXISTS(SELECT 1 FROM pay54.financial_operations)
 THEN RAISE EXCEPTION 'Role privilege tests created records'; END IF;
 RAISE NOTICE 'PASS: Account reader has no customer or financial access';
END;
$$;
ROLLBACK;
