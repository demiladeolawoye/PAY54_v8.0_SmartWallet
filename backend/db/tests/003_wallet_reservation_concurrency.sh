
#!/usr/bin/env bash
# PAY54 WP-P54-BACKEND-001E: two-session concurrency verification.
# Run only in a disposable PostgreSQL CI database with migrations 001-003.
set -euo pipefail

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
UPDATE pay54.currencies SET active = TRUE WHERE code = 'NGN';

CREATE TABLE public.pay54_ci_reservation_fixture (
    scenario TEXT PRIMARY KEY,
    owner_subject UUID NOT NULL,
    source_account UUID NOT NULL,
    destination_wallet UUID NOT NULL
);

DO $$
DECLARE
  v_owner UUID := gen_random_uuid();
  v_dest UUID;
  v_dest_account UUID;
  v_clearing UUID;
  v_source_wallet UUID;
  v_source_account UUID;
  v_journal UUID;
  v_scenario TEXT;
BEGIN
  INSERT INTO pay54.wallets(owner_subject,market_code,status)
  VALUES (gen_random_uuid(),'NG','ACTIVE') RETURNING id INTO v_dest;

  INSERT INTO pay54.ledger_accounts
    (wallet_id,currency,account_class,account_reference)
  VALUES (
    v_dest,'NGN','CUSTOMER_LIABILITY',
    'ci-dest-'||gen_random_uuid()
  )
  RETURNING id INTO v_dest_account;

  INSERT INTO pay54.ledger_accounts
    (currency,account_class,account_reference)
  VALUES (
    'NGN','PROVIDER_CLEARING',
    'ci-clearing-'||gen_random_uuid()
  )
  RETURNING id INTO v_clearing;

  FOREACH v_scenario IN ARRAY ARRAY['overspend','idempotency'] LOOP
    INSERT INTO pay54.wallets(owner_subject,market_code,status)
    VALUES (v_owner,'NG','ACTIVE')
    RETURNING id INTO v_source_wallet;

    INSERT INTO pay54.ledger_accounts
      (wallet_id,currency,account_class,account_reference)
    VALUES (
      v_source_wallet,'NGN','CUSTOMER_LIABILITY',
      'ci-source-'||gen_random_uuid()
    )
    RETURNING id INTO v_source_account;

    INSERT INTO pay54.ledger_journals(journal_type)
    VALUES ('FUNDING') RETURNING id INTO v_journal;

    INSERT INTO pay54.ledger_entries
      (journal_id,account_id,currency,amount_minor)
    VALUES
      (v_journal,v_source_account,'NGN',10000),
      (v_journal,v_clearing,'NGN',-10000);

    UPDATE pay54.ledger_journals
       SET status='POSTED',posted_at=clock_timestamp()
     WHERE id=v_journal;

    INSERT INTO public.pay54_ci_reservation_fixture
    VALUES (v_scenario,v_owner,v_source_account,v_dest);
  END LOOP;
END;
$$;
SQL

run_request() {
  local owner="$1" account="$2" dest="$3"
  local amount="$4" key="$5" digest="$6"

  psql -X -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -At -F '|' \
    -c "SELECT outcome, operation_id
      FROM pay54.reserve_wallet_transfer(
        '$owner'::uuid,
        '$account'::uuid,
        '$dest'::uuid,
        $amount::bigint,
        '$key',
        '$digest',
        clock_timestamp() + interval '1 hour'
      );"
}

IFS='|' read -r owner account dest < <(
  psql -X -v ON_ERROR_STOP=1 -At -F '|' \
    -c "SELECT owner_subject,source_account,destination_wallet
        FROM public.pay54_ci_reservation_fixture
        WHERE scenario='overspend';"
)

run_request "$owner" "$account" "$dest" 7000 \
  pay54-ci-race-key-00001 "$(printf 'a%.0s' {1..64})" \
  >"$workdir/a.out" 2>"$workdir/a.err" & pid_a=$!

run_request "$owner" "$account" "$dest" 7000 \
  pay54-ci-race-key-00002 "$(printf 'b%.0s' {1..64})" \
  >"$workdir/b.out" 2>"$workdir/b.err" & pid_b=$!

if wait "$pid_a"; then rc_a=0; else rc_a=$?; fi
if wait "$pid_b"; then rc_b=0; else rc_b=$?; fi

if [[ "$rc_a" -eq 0 && "$rc_b" -ne 0 ]]; then
  grep -q 'P5401' "$workdir/b.err"
elif [[ "$rc_b" -eq 0 && "$rc_a" -ne 0 ]]; then
  grep -q 'P5401' "$workdir/a.err"
else
  echo 'FAIL: competing reservations did not produce one success' >&2
  cat "$workdir/a.out" "$workdir/a.err" >&2
  cat "$workdir/b.out" "$workdir/b.err" >&2
  exit 1
fi

result="$(psql -X -v ON_ERROR_STOP=1 -At -c "
SELECT COUNT(*)::text || '|' || COALESCE(SUM(amount_minor),0)::text
FROM pay54.balance_reservations
WHERE account_id='$account'::uuid AND status='HELD';")"

[[ "$result" == '1|7000' ]] || {
  echo "FAIL: unexpected overspend holds: $result" >&2
  exit 1
}

echo 'PASS: concurrent distinct requests cannot overspend 10000'

IFS='|' read -r owner account dest < <(
  psql -X -v ON_ERROR_STOP=1 -At -F '|' \
    -c "SELECT owner_subject,source_account,destination_wallet
        FROM public.pay54_ci_reservation_fixture
        WHERE scenario='idempotency';"
)

run_request "$owner" "$account" "$dest" 6000 \
  pay54-ci-same-key-00001 "$(printf 'c%.0s' {1..64})" \
  >"$workdir/c.out" 2>"$workdir/c.err" & pid_c=$!

run_request "$owner" "$account" "$dest" 6000 \
  pay54-ci-same-key-00001 "$(printf 'c%.0s' {1..64})" \
  >"$workdir/d.out" 2>"$workdir/d.err" & pid_d=$!

wait "$pid_c"
wait "$pid_d"

IFS='|' read -r outcome_c operation_c < "$workdir/c.out"
IFS='|' read -r outcome_d operation_d < "$workdir/d.out"

[[ "$operation_c" == "$operation_d" ]] || {
  echo 'FAIL: retries returned different operation IDs' >&2
  exit 1
}

[[ ( "$outcome_c" == 'CREATED' && "$outcome_d" == 'REPLAY' ) ||
   ( "$outcome_c" == 'REPLAY' && "$outcome_d" == 'CREATED' ) ]] || {
  echo 'FAIL: retries not resolved as one create and one replay' >&2
  exit 1
}

result="$(psql -X -v ON_ERROR_STOP=1 -At -c "
SELECT COUNT(*)::text || '|' || COALESCE(SUM(amount_minor),0)::text
FROM pay54.balance_reservations
WHERE account_id='$account'::uuid AND status='HELD';")"

[[ "$result" == '1|6000' ]] || {
  echo "FAIL: duplicate idempotency holds: $result" >&2
  exit 1
}

echo 'PASS: concurrent identical keys resolve to one operation'
