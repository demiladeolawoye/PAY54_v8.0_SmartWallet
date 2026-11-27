-- PAY54 Wave9 effective-role PostgreSQL proof after forward candidate.
\set ON_ERROR_STOP on
BEGIN READ ONLY;
SET LOCAL statement_timeout='25s';
DO $guard$
BEGIN
 IF current_database()<>'pay54_disposable_ci'
 OR (SELECT count(*) FROM pg_policies WHERE schemaname='pay54'
 AND policyname LIKE 'pay54_w9_deny_%')<>5
 THEN RAISE EXCEPTION 'PAY54_W9_EFFECTIVE_ROLE_PRECONDITION'; END IF;
END $guard$;
SET LOCAL ROLE pay54_writer9_owner_candidate;
DO $denial$
DECLARE denied boolean;
BEGIN
 IF current_user<>'pay54_writer9_owner_candidate' THEN
  RAISE EXCEPTION 'PAY54_W9_ROLE_SWITCH_FAILED'; END IF;
 denied:=false;
 BEGIN PERFORM 1 FROM pay54.ledger_entries LIMIT 1;
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'PAY54_W9_LEDGER_SELECT_EXPOSED'; END IF;
 denied:=false;
 BEGIN PERFORM 1 FROM pay54.financial_operations LIMIT 1;
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'PAY54_W9_OPERATION_READ_EXPOSED'; END IF;
 IF EXISTS(
  SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='pay54'
  AND p.proname IN ('reserve_wallet_transfer',
    'capture_reserved_wallet_transfer','release_reserved_wallet_transfer')
  AND has_function_privilege(current_user,p.oid,'EXECUTE')
 ) THEN RAISE EXCEPTION 'PAY54_W9_CANONICAL_EXECUTE_EXPOSED'; END IF;
END $denial$;
RESET ROLE;
COMMIT;
\echo PAY54_W9_ACTUAL_EFFECTIVE_ROLE_DENIAL_PASS
