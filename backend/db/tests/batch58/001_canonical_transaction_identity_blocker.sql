-- PAY54 Wave5 — real canonical PG16 admission blocker, READ ONLY.
-- Asserts current financial routines cannot be promoted to runtime money writers.
\set ON_ERROR_STOP on
BEGIN READ ONLY;
SET LOCAL statement_timeout='25s';
DO $audit$
DECLARE sig text; fn oid; src text; r oid; blockers integer:=0;
BEGIN
 IF current_database()<>'pay54_disposable_ci' OR current_user<>'postgres'
 OR to_regclass('pay54.auth_sessions') IS NULL
 OR to_regprocedure('pay54.wallet_read_restricted_v1(bytea,uuid,uuid,character varying)') IS NULL
 THEN RAISE EXCEPTION 'PAY54_W5_DISPOSABLE_CANONICAL_PRECONDITION_FAILED'; END IF;
 SELECT oid INTO r FROM pg_roles WHERE rolname='pay54_ledger_executor_role'
  AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls;
 IF r IS NULL THEN RAISE EXCEPTION 'PAY54_W5_UNSAFE_EXECUTOR_ROLE'; END IF;
 FOREACH sig IN ARRAY ARRAY[
  'pay54.reserve_wallet_transfer(uuid,uuid,uuid,bigint,text,text,timestamp with time zone)',
  'pay54.capture_reserved_wallet_transfer(uuid,uuid)',
  'pay54.release_reserved_wallet_transfer(uuid,uuid,text)'
 ] LOOP
  fn=to_regprocedure(sig);
  IF fn IS NULL THEN RAISE EXCEPTION 'PAY54_W5_MISSING_CANONICAL_FUNCTION: %',sig; END IF;
  SELECT p.prosrc INTO src FROM pg_proc p WHERE p.oid=fn AND NOT p.prosecdef;
  IF src IS NULL THEN RAISE EXCEPTION 'PAY54_W5_CANONICAL_SECURITY_MODE_CHANGED: %',sig; END IF;
  IF has_function_privilege(r,fn,'EXECUTE')
  THEN RAISE EXCEPTION 'PAY54_W5_FINANCIAL_EXECUTOR_EXPOSED: %',sig; END IF;
  -- This deliberately identifies the existing missing authentication/
  -- session-lock binding. It MUST NOT be treated as production readiness.
  IF src ~* '\mpay54[.]auth_sessions\M'
  THEN RAISE EXCEPTION 'PAY54_W5_CANONICAL_SESSION_DESIGN_CHANGED_REVIEW_REQUIRED: %',sig;
  END IF;
  blockers=blockers+1;
 END LOOP;
 IF blockers<>3 THEN RAISE EXCEPTION 'PAY54_W5_INCOMPLETE_DENIAL_EVIDENCE'; END IF;
 IF has_table_privilege(r,'pay54.ledger_entries','INSERT')
 OR has_table_privilege(r,'pay54.balance_reservations','UPDATE')
 OR has_table_privilege(r,'pay54.financial_operations','INSERT')
 THEN RAISE EXCEPTION 'PAY54_W5_CANONICAL_MONEY_ACCESS_LEAK'; END IF;
 RAISE NOTICE 'PAY54_W5_PASS: all 3 canonical functions lack in-function session binding; money executor denied; POSITIVE ADMISSION NO-GO';
END $audit$;
COMMIT;
