-- PAY54 Batch 34: INERT wallet-read authority foundation, SOURCE ONLY.
-- No production deployment authorisation and no reader EXECUTE grant.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $pre$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN
   ('pay54_wallet_read_owner_role','pay54_wallet_read_caller_role'))
 OR to_regclass('pay54.ledger_entries') IS NULL
 OR to_regclass('pay54.auth_sessions') IS NULL
 OR NOT (SELECT relforcerowsecurity FROM pg_class
   WHERE oid='pay54.auth_sessions'::regclass)
 OR NOT (SELECT relforcerowsecurity FROM pg_class
   WHERE oid='pay54.account_contexts'::regclass)
 OR NOT (SELECT relforcerowsecurity FROM pg_class
   WHERE oid='pay54.account_memberships'::regclass)
 OR NOT (SELECT relforcerowsecurity FROM pg_class
   WHERE oid='pay54.personal_wallet_bindings'::regclass)
 THEN
  RAISE EXCEPTION 'PAY54_WALLET_READ_AUTHORITY_PRECONDITION_DENIED';
 END IF;
END $pre$;
CREATE ROLE pay54_wallet_read_owner_role
 NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE ROLE pay54_wallet_read_caller_role
 NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
REVOKE ALL ON SCHEMA pay54 FROM pay54_wallet_read_owner_role,pay54_wallet_read_caller_role;
REVOKE ALL ON ALL TABLES IN SCHEMA pay54 FROM
 pay54_wallet_read_owner_role,pay54_wallet_read_caller_role;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA pay54 FROM
 pay54_wallet_read_owner_role,pay54_wallet_read_caller_role;
GRANT USAGE ON SCHEMA pay54 TO pay54_wallet_read_owner_role,pay54_wallet_read_caller_role;

-- Hardened inert entry point: never reads customer data, never authorises
-- transactions and cannot be called by any application role.
CREATE FUNCTION pay54.wallet_read_authority_status()
RETURNS TABLE(read_enabled boolean,authority_status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog
AS $function$
 SELECT false,'INERT_PENDING_RLS_AND_SETTLEMENT_REVIEW'::text;
$function$;
REVOKE ALL ON FUNCTION pay54.wallet_read_authority_status() FROM PUBLIC;
ALTER FUNCTION pay54.wallet_read_authority_status()
 OWNER TO pay54_wallet_read_owner_role;

DO $post$
DECLARE c oid; o oid;
BEGIN
 SELECT oid INTO c FROM pg_roles WHERE rolname='pay54_wallet_read_caller_role';
 SELECT oid INTO o FROM pg_roles WHERE rolname='pay54_wallet_read_owner_role';
 IF c IS NULL OR o IS NULL OR c=o
 OR EXISTS(SELECT 1 FROM pg_auth_members WHERE roleid IN(c,o) OR member IN(c,o))
 OR EXISTS(
   SELECT 1 FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace
   WHERE n.nspname='pay54' AND t.relkind IN('r','p','v','m','f')
   AND (has_table_privilege(c,t.oid,'SELECT')
    OR has_table_privilege(c,t.oid,'INSERT')
    OR has_table_privilege(c,t.oid,'UPDATE')
    OR has_table_privilege(c,t.oid,'DELETE')
    OR has_table_privilege(o,t.oid,'SELECT')
    OR has_table_privilege(o,t.oid,'INSERT')
    OR has_table_privilege(o,t.oid,'UPDATE')
    OR has_table_privilege(o,t.oid,'DELETE'))
 )
 OR has_function_privilege('pay54_wallet_read_caller_role',
   'pay54.wallet_read_authority_status()','EXECUTE')
 OR has_function_privilege('pay54_wallet_read_owner_role',
   'pay54.reserve_wallet_transfer(uuid,uuid,uuid,bigint,text,text,timestamp with time zone)','EXECUTE')
 THEN
   RAISE EXCEPTION 'PAY54_WALLET_READ_INERT_PRIVILEGE_BOUNDARY_BREACHED';
 END IF;
END $post$;
COMMIT;
