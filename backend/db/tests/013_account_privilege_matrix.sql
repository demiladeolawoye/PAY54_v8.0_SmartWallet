-- PAY54 BATCH 05 / 013 — restricted account privilege matrix
-- Disposable PostgreSQL 16 CI only, migrations 001–012.
-- This is a negative test, NOT a migration and NOT a production grant.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';

DO $$
DECLARE
  r RECORD;
  name TEXT;
  relation_name TEXT;
BEGIN
  FOREACH name IN ARRAY ARRAY[
    'pay54_financial_app_role',
    'pay54_financial_audit_role',
    'pay54_ledger_executor_role',
    'pay54_account_reader_role'
  ]
  LOOP
    SELECT * INTO r FROM pg_roles WHERE rolname=name;
    IF NOT FOUND OR r.rolcanlogin OR r.rolsuper OR r.rolbypassrls
       OR r.rolinherit OR r.rolcreatedb OR r.rolcreaterole THEN
      RAISE EXCEPTION 'Restricted PAY54 role unsafe: %',name;
    END IF;
    IF EXISTS(SELECT 1 FROM pg_auth_members WHERE roleid=r.oid OR member=r.oid)
    THEN RAISE EXCEPTION 'Restricted PAY54 role has unapproved membership: %',name; END IF;

    FOREACH relation_name IN ARRAY ARRAY[
      'pay54.account_contexts',
      'pay54.account_memberships',
      'pay54.personal_wallet_bindings',
      'pay54.eligible_personal_wallet_bindings',
      'pay54.wallets',
      'pay54.ledger_entries',
      'pay54.financial_operations',
      'pay54.balance_reservations'
    ]
    LOOP
      IF has_table_privilege(name,relation_name,'SELECT')
        OR has_table_privilege(name,relation_name,'INSERT')
        OR has_table_privilege(name,relation_name,'UPDATE')
        OR has_table_privilege(name,relation_name,'DELETE')
        OR has_table_privilege(name,relation_name,'TRUNCATE')
      THEN RAISE EXCEPTION 'Restricted role % unexpectedly accesses %',name,relation_name; END IF;
    END LOOP;

    IF has_function_privilege(name,'pay54.capture_reserved_wallet_transfer(uuid,uuid)','EXECUTE')
      OR has_function_privilege(name,'pay54.release_reserved_wallet_transfer(uuid,uuid,text)','EXECUTE')
    THEN RAISE EXCEPTION 'Restricted role % can execute financial operations',name; END IF;
  END LOOP;
  RAISE NOTICE 'PASS: all restricted PAY54 roles denied customer and money data';
END;
$$;
ROLLBACK;
