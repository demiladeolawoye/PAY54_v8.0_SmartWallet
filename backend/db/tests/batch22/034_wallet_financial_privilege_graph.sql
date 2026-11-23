-- PAY54 Batch39: real PostgreSQL catalogue proof on candidate forward schema.
-- Run strictly inside disposable PG16 AFTER Batch38 forward, BEFORE rollback.
\set ON_ERROR_STOP on
DO $audit$
DECLARE
 owner_oid oid;
 caller_oid oid;
 function_oid oid;
BEGIN
 SELECT oid INTO owner_oid FROM pg_roles WHERE rolname='pay54_wallet_read_owner_role'
  AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcanlogin;
 SELECT oid INTO caller_oid FROM pg_roles WHERE rolname='pay54_wallet_read_caller_role'
  AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcanlogin;
 SELECT oid INTO function_oid FROM pg_proc WHERE oid=
  to_regprocedure('pay54.wallet_read_restricted_v1(bytea,uuid,uuid,character varying)');
 IF owner_oid IS NULL OR caller_oid IS NULL OR function_oid IS NULL
 OR owner_oid=caller_oid
 OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=function_oid
   AND proowner=owner_oid AND prosecdef)
 OR EXISTS(SELECT 1 FROM pg_auth_members
   WHERE (roleid=owner_oid AND member=caller_oid)
      OR (roleid=caller_oid AND member=owner_oid))
 OR (SELECT COUNT(*) FROM pg_class WHERE oid IN (
  'pay54.auth_sessions'::regclass,
  'pay54.account_contexts'::regclass,
  'pay54.account_memberships'::regclass,
  'pay54.personal_wallet_bindings'::regclass,
  'pay54.wallets'::regclass,
  'pay54.ledger_accounts'::regclass,
  'pay54.ledger_entries'::regclass,
  'pay54.ledger_journals'::regclass,
  'pay54.balance_reservations'::regclass
 ) AND relrowsecurity AND relforcerowsecurity)<>9
 OR (SELECT COUNT(*) FROM pg_policies
   WHERE schemaname='pay54' AND policyname LIKE 'pay54_wallet38_%')<>9
 OR NOT has_function_privilege(caller_oid,function_oid,'EXECUTE')
 OR has_table_privilege(caller_oid,'pay54.ledger_entries','SELECT')
 OR has_table_privilege(caller_oid,'pay54.balance_reservations','SELECT')
 OR has_table_privilege(caller_oid,'pay54.auth_sessions','SELECT')
 OR has_table_privilege(caller_oid,'pay54.ledger_entries','INSERT')
 OR has_table_privilege(caller_oid,'pay54.ledger_entries','UPDATE')
 OR has_table_privilege(caller_oid,'pay54.ledger_entries','DELETE')
 OR NOT has_table_privilege(owner_oid,'pay54.ledger_entries','SELECT')
 OR NOT has_table_privilege(owner_oid,'pay54.auth_sessions','SELECT')
 OR EXISTS (
  SELECT 1 FROM pg_proc p,CROSS JOIN LATERAL aclexplode(
   COALESCE(p.proacl,acldefault('f',p.proowner))) x
  WHERE p.oid=function_oid AND x.grantee=0 AND x.privilege_type='EXECUTE')
 THEN RAISE EXCEPTION 'PAY54_B39_FINANCIAL_PRIVILEGE_GRAPH_DENIED';
 END IF;
END $audit$;
SELECT 'PASS — disposable restricted-reader role/function/RLS catalogue graph'
 AS batch39_catalogue_result;
