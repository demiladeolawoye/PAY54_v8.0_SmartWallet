-- Batch44: independent post-rollback checks in the same disposable PG16 instance.
\set ON_ERROR_STOP on
BEGIN READ ONLY;
DO $audit$
DECLARE relation_name text;
BEGIN
 IF current_database()<>'pay54_disposable_ci'
 OR to_regprocedure('pay54.wallet_read_restricted_v1(bytea,uuid,uuid,character varying)') IS NOT NULL
 THEN RAISE EXCEPTION 'PAY54_B44_ROLLBACK_PRECONDITION_FAILED'; END IF;
 FOREACH relation_name IN ARRAY ARRAY['wallets','ledger_accounts','ledger_entries',
   'ledger_journals','balance_reservations']
 LOOP
  IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='pay54' AND c.relname=relation_name
    AND (c.relrowsecurity OR c.relforcerowsecurity))
  THEN RAISE EXCEPTION 'PAY54_B44_RLS_STATE_NOT_RESTORED: %',relation_name; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_policies
   WHERE schemaname='pay54' AND policyname LIKE 'pay54_wallet38_%')
 OR has_table_privilege('pay54_wallet_read_owner_role','pay54.ledger_entries','SELECT')
 OR has_table_privilege('pay54_wallet_read_caller_role','pay54.ledger_entries','SELECT')
 OR has_function_privilege('pay54_ledger_executor_role',
   'pay54.reserve_wallet_transfer(uuid,uuid,uuid,bigint,text,text,timestamp with time zone)',
   'EXECUTE')
 THEN RAISE EXCEPTION 'PAY54_B44_ROLLBACK_PRIVILEGE_LEAK'; END IF;
 RAISE NOTICE 'PASS: disposable candidate rollback restores baseline RLS and denies privileges';
END $audit$;
COMMIT;
