
-- PAY54 WP-P54-BACKEND-001E | Isolated SQL acceptance tests.
-- Requires migrations 001, 002 and 003; use a disposable CI database.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';

DO $$
DECLARE
  v_owner UUID := gen_random_uuid();
  v_other_owner UUID := gen_random_uuid();
  v_source_wallet UUID;
  v_destination_wallet UUID;
  v_source_account UUID;
  v_destination_account UUID;
  v_clearing UUID;
  v_journal UUID;
  v_first UUID;
  v_second UUID;
  v_replay UUID;
  v_outcome TEXT;
  v_state TEXT;
  v_key TEXT := 'pay54-reservation-test-0001';
  v_digest TEXT := repeat('a',64);
BEGIN
  UPDATE pay54.currencies SET active = TRUE WHERE code = 'NGN';

  INSERT INTO pay54.wallets (owner_subject, market_code, status)
  VALUES (v_owner, 'NG', 'ACTIVE') RETURNING id INTO v_source_wallet;

  INSERT INTO pay54.wallets (owner_subject, market_code, status)
  VALUES (v_other_owner, 'NG', 'ACTIVE') RETURNING id INTO v_destination_wallet;

  INSERT INTO pay54.ledger_accounts
    (wallet_id, currency, account_class, account_reference)
  VALUES (v_source_wallet, 'NGN', 'CUSTOMER_LIABILITY',
          'test-source-' || gen_random_uuid())
  RETURNING id INTO v_source_account;

  INSERT INTO pay54.ledger_accounts
    (wallet_id, currency, account_class, account_reference)
  VALUES (v_destination_wallet, 'NGN', 'CUSTOMER_LIABILITY',
          'test-destination-' || gen_random_uuid())
  RETURNING id INTO v_destination_account;

  INSERT INTO pay54.ledger_accounts
    (currency, account_class, account_reference)
  VALUES ('NGN', 'PROVIDER_CLEARING',
          'test-clearing-' || gen_random_uuid())
  RETURNING id INTO v_clearing;

  INSERT INTO pay54.ledger_journals (journal_type)
  VALUES ('FUNDING') RETURNING id INTO v_journal;

  INSERT INTO pay54.ledger_entries
    (journal_id, account_id, currency, amount_minor)
  VALUES (v_journal, v_source_account, 'NGN', 10000),
         (v_journal, v_clearing, 'NGN', -10000);

  UPDATE pay54.ledger_journals
     SET status = 'POSTED', posted_at = clock_timestamp()
   WHERE id = v_journal;
  SET CONSTRAINTS ALL IMMEDIATE;

  SELECT operation_id, outcome INTO v_first, v_outcome
    FROM pay54.reserve_wallet_transfer(
      v_owner, v_source_account, v_destination_wallet, 6000,
      v_key, v_digest, clock_timestamp() + interval '1 hour'
    );

  IF v_outcome <> 'CREATED' OR v_first IS NULL THEN
    RAISE EXCEPTION 'FAIL: first reservation not created';
  END IF;

  SELECT state INTO v_state FROM pay54.financial_operations
   WHERE id = v_first;
  IF v_state <> 'RESERVED' THEN
    RAISE EXCEPTION 'FAIL: operation did not transition to RESERVED';
  END IF;

  -- Same key and same digest must return original operation and
  -- must not create another reservation or outbox event.
  SELECT operation_id, outcome INTO v_replay, v_outcome
    FROM pay54.reserve_wallet_transfer(
      v_owner, v_source_account, v_destination_wallet, 6000,
      v_key, v_digest, clock_timestamp() + interval '1 hour'
    );
  IF v_replay IS DISTINCT FROM v_first OR v_outcome <> 'REPLAY' THEN
    RAISE EXCEPTION 'FAIL: idempotency replay mismatch';
  END IF;
  IF (SELECT COUNT(*) FROM pay54.balance_reservations
      WHERE operation_id = v_first) <> 1 THEN
    RAISE EXCEPTION 'FAIL: duplicate reservation';
  END IF;

  BEGIN
    PERFORM * FROM pay54.reserve_wallet_transfer(
      v_owner, v_source_account, v_destination_wallet, 6000,
      v_key, repeat('b',64), clock_timestamp() + interval '1 hour'
    );
    RAISE EXCEPTION 'FAIL: changed digest accepted';
  EXCEPTION WHEN SQLSTATE 'P5402' THEN
    RAISE NOTICE 'PASS: conflicting idempotency request rejected';
  END;

  BEGIN
    PERFORM * FROM pay54.reserve_wallet_transfer(
      v_owner, v_source_account, v_destination_wallet, 4001,
      'pay54-reservation-test-0002', repeat('c',64),
      clock_timestamp() + interval '1 hour'
    );
    RAISE EXCEPTION 'FAIL: overspending accepted';
  EXCEPTION WHEN SQLSTATE 'P5401' THEN
    RAISE NOTICE 'PASS: overspending rejected';
  END;

  BEGIN
    PERFORM * FROM pay54.reserve_wallet_transfer(
      v_other_owner, v_source_account, v_destination_wallet, 100,
      'pay54-reservation-test-0003', repeat('d',64),
      clock_timestamp() + interval '1 hour'
    );
    RAISE EXCEPTION 'FAIL: unauthorized source accepted';
  EXCEPTION WHEN SQLSTATE 'P5403' THEN
    RAISE NOTICE 'PASS: incorrect owner rejected';
  END;

  -- Remaining 4000 minor units can be reserved exactly.
  SELECT operation_id, outcome INTO v_second, v_outcome
    FROM pay54.reserve_wallet_transfer(
      v_owner, v_source_account, v_destination_wallet, 4000,
      'pay54-reservation-test-0004', repeat('e',64),
      clock_timestamp() + interval '1 hour'
    );
  IF v_second IS NULL OR v_outcome <> 'CREATED' THEN
    RAISE EXCEPTION 'FAIL: exact remaining amount rejected';
  END IF;

  BEGIN
    PERFORM * FROM pay54.reserve_wallet_transfer(
      v_owner, v_source_account, v_destination_wallet, 1,
      'pay54-reservation-test-0005', repeat('f',64),
      clock_timestamp() + interval '1 hour'
    );
    RAISE EXCEPTION 'FAIL: funds already held were spent again';
  EXCEPTION WHEN SQLSTATE 'P5401' THEN
    RAISE NOTICE 'PASS: fully reserved wallet cannot reserve again';
  END;

  IF (SELECT COUNT(*) FROM pay54.financial_operations
      WHERE owner_subject = v_owner) <> 2
    OR (SELECT COUNT(*) FROM pay54.balance_reservations
        WHERE account_id = v_source_account AND status = 'HELD') <> 2
    OR (SELECT COUNT(*) FROM pay54.outbox_events
        WHERE aggregate_id IN (v_first, v_second)) <> 2
  THEN
    RAISE EXCEPTION 'FAIL: atomic operation/reservation/outbox counts';
  END IF;

  RAISE NOTICE 'PASS: reservation integrity and atomicity assertions';
END;
$$;
ROLLBACK;
