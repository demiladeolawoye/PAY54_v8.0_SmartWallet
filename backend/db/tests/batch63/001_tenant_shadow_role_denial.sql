-- PAY54 Wave10: real PostgreSQL role cannot see tenant data even with shadow policies.
\set ON_ERROR_STOP on
BEGIN READ ONLY;
SET LOCAL statement_timeout='25s';
DO $pre$
BEGIN
 IF current_database()<>'pay54_disposable_ci'
 OR (SELECT count(*) FROM pg_policies WHERE policyname LIKE 'pay54_w10_scope_%')<>5
 THEN RAISE EXCEPTION 'PAY54_W10_PROOF_PRECONDITION'; END IF;
END $pre$;
SET LOCAL ROLE pay54_writer9_owner_candidate;
DO $proof$
DECLARE denied boolean;
BEGIN
 IF current_user<>'pay54_writer9_owner_candidate'
 THEN RAISE EXCEPTION 'PAY54_W10_WRONG_EFFECTIVE_ROLE'; END IF;
 -- A client can arbitrarily spoof custom GUC values. Even with these set,
 -- no role privilege or RLS data visibility must become available.
 PERFORM set_config('pay54.w10_token',repeat('a7',32),true);
 denied:=false;
 BEGIN PERFORM 1 FROM pay54.wallets LIMIT 1;
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'PAY54_W10_WALLET_READ_EXPOSED'; END IF;
 denied:=false;
 BEGIN PERFORM 1 FROM pay54.ledger_entries LIMIT 1;
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'PAY54_W10_ENTRY_READ_EXPOSED'; END IF;
 denied:=false;
 BEGIN PERFORM 1 FROM pay54.balance_reservations LIMIT 1;
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'PAY54_W10_HOLD_READ_EXPOSED'; END IF;
 IF EXISTS(
  SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='pay54'
  AND p.proname IN ('reserve_wallet_transfer',
                   'capture_reserved_wallet_transfer',
                   'release_reserved_wallet_transfer')
  AND has_function_privilege(current_user,p.oid,'EXECUTE')
 ) THEN RAISE EXCEPTION 'PAY54_W10_FINANCIAL_EXECUTE_EXPOSED'; END IF;
END $proof$;
RESET ROLE;
COMMIT;
\echo PAY54_W10_SPOOFED_GUC_EFFECTIVE_ROLE_DENIAL_PASS
