
#!/usr/bin/env bash
# ============================================================================
# PAY54 FINANCIAL CAPTURE / RELEASE CONCURRENCY TESTS
# File: backend/db/tests/007_capture_release_concurrency.sh
# Version: 1.0.0
# Work Package: WP-P54-BACKEND-001G.3
#
# PostgreSQL 16+
# Requires PAY54 migrations 001-006.
#
# DISPOSABLE DATABASES ONLY.
# Creates synthetic accounts, reservations and ledger entries.
# Never use against an operational financial database.
# ============================================================================

set -Eeuo pipefail

workspace="$(mktemp -d)"
trap 'jobs -pr | xargs -r kill 2>/dev/null || true; rm -rf "$workspace"' EXIT

export PGOPTIONS="-c statement_timeout=30000"

sql() {
    psql -X -v ON_ERROR_STOP=1 -At "$@"
}

echo "PAY54: Preparing isolated financial lifecycle race fixtures"

sql <<'SQL'
BEGIN;

UPDATE pay54.currencies
SET active = TRUE
WHERE code = 'NGN';

CREATE TABLE public.pay54_ci_lifecycle_races (
    scenario TEXT PRIMARY KEY,
    owner_subject UUID NOT NULL,
    source_account UUID NOT NULL,
    destination_account UUID NOT NULL,
    operation_id UUID NOT NULL
);

DO $$
DECLARE
    v_scenario TEXT;
    v_owner UUID;
    v_destination_owner UUID;
    v_source_wallet UUID;
    v_destination_wallet UUID;
    v_source_account UUID;
    v_destination_account UUID;
    v_clearing UUID;
    v_funding_journal UUID;
    v_operation UUID;
    v_outcome TEXT;
    v_key TEXT;
    v_digest TEXT;
BEGIN
    FOREACH v_scenario IN ARRAY ARRAY[
        'capture_release',
        'capture_capture',
        'release_release'
    ]
    LOOP
        v_owner := gen_random_uuid();
        v_destination_owner := gen_random_uuid();

        INSERT INTO pay54.wallets (
            owner_subject, market_code, status
        )
        VALUES (v_owner, 'NG', 'ACTIVE')
        RETURNING id INTO v_source_wallet;

        INSERT INTO pay54.wallets (
            owner_subject, market_code, status
        )
        VALUES (v_destination_owner, 'NG', 'ACTIVE')
        RETURNING id INTO v_destination_wallet;

        INSERT INTO pay54.ledger_accounts (
            wallet_id, currency, account_class,
            account_reference
        )
        VALUES (
            v_source_wallet, 'NGN', 'CUSTOMER_LIABILITY',
            'race-source-' || gen_random_uuid()::TEXT
        )
        RETURNING id INTO v_source_account;

        INSERT INTO pay54.ledger_accounts (
            wallet_id, currency, account_class,
            account_reference
        )
        VALUES (
            v_destination_wallet, 'NGN', 'CUSTOMER_LIABILITY',
            'race-destination-' || gen_random_uuid()::TEXT
        )
        RETURNING id INTO v_destination_account;

        INSERT INTO pay54.ledger_accounts (
            currency, account_class, account_reference
        )
        VALUES (
            'NGN', 'PROVIDER_CLEARING',
            'race-clearing-' || gen_random_uuid()::TEXT
        )
        RETURNING id INTO v_clearing;

        INSERT INTO pay54.ledger_journals (journal_type)
        VALUES ('FUNDING')
        RETURNING id INTO v_funding_journal;

        INSERT INTO pay54.ledger_entries (
            journal_id, account_id, currency, amount_minor
        )
        VALUES
            (v_funding_journal, v_source_account, 'NGN', 10000),
            (v_funding_journal, v_clearing, 'NGN', -10000);

        UPDATE pay54.ledger_journals
        SET status = 'POSTED',
            posted_at = clock_timestamp()
        WHERE id = v_funding_journal;

        SET CONSTRAINTS ALL IMMEDIATE;

        v_key := 'pay54-race-' || v_scenario || '-0001';
        v_digest := repeat('a', 64);

        SELECT r.operation_id, r.outcome
        INTO v_operation, v_outcome
        FROM pay54.reserve_wallet_transfer(
            v_owner,
            v_source_account,
            v_destination_wallet,
            6000,
            v_key,
            v_digest,
            clock_timestamp() + INTERVAL '1 hour'
        ) AS r;

        IF v_operation IS NULL OR v_outcome <> 'CREATED' THEN
            RAISE EXCEPTION
                'Failed to create % reservation', v_scenario;
        END IF;

        INSERT INTO public.pay54_ci_lifecycle_races
        VALUES (
            v_scenario, v_owner, v_source_account,
            v_destination_account, v_operation
        );
    END LOOP;
END;
$$;

COMMIT;
SQL

# ============================================================================
# Execute one lifecycle instruction in a separate PostgreSQL session.
# ============================================================================

worker() {
    local action="$1"
    local owner="$2"
    local operation="$3"

    if [[ "$action" == "capture" ]]; then
        psql -X -v ON_ERROR_STOP=1 \
            -v VERBOSITY=verbose -At \
            -c "SELECT outcome
                FROM pay54.capture_reserved_wallet_transfer(
                    '$owner'::uuid,
                    '$operation'::uuid
                );"
    elif [[ "$action" == "release" ]]; then
        psql -X -v ON_ERROR_STOP=1 \
            -v VERBOSITY=verbose -At \
            -c "SELECT outcome
                FROM pay54.release_reserved_wallet_transfer(
                    '$owner'::uuid,
                    '$operation'::uuid,
                    'CUSTOMER_CANCELLED'
                );"
    else
        echo "Unknown worker action: $action" >&2
        return 1
    fi
}

# ============================================================================
# Hold the operation row lock before releasing two competing workers.
# This guarantees that both sessions encounter real lock contention.
# ============================================================================

run_race() {
    local scenario="$1"
    local action_a="$2"
    local action_b="$3"

    local owner
    local operation
    local ready="$workspace/${scenario}.ready"

    IFS='|' read -r owner operation < <(
        sql -F '|' -c "
            SELECT owner_subject, operation_id
            FROM public.pay54_ci_lifecycle_races
            WHERE scenario = '$scenario';
        "
    )

    [[ -n "$owner" && -n "$operation" ]] || {
        echo "FAIL: Missing fixture for $scenario" >&2
        exit 1
    }

    # A separate connection locks this operation for twelve seconds.
    # The ready file is created only after the lock is acquired.

    (
        psql -X -v ON_ERROR_STOP=1 -q <<SQL
BEGIN;
SELECT id
FROM pay54.financial_operations
WHERE id = '$operation'::uuid
FOR UPDATE;
\! touch "$ready"
SELECT pg_sleep(12);
COMMIT;
SQL
    ) >"$workspace/${scenario}.blocker.log" \
      2>"$workspace/${scenario}.blocker.err" &

    local blocker_pid=$!

    local ready_found=0

    for ((i=0; i<100; i++)); do
        if [[ -f "$ready" ]]; then
            ready_found=1
            break
        fi
        sleep 0.05
    done

    if [[ "$ready_found" -ne 1 ]]; then
        echo "FAIL: Lock blocker did not initialise" >&2
        cat "$workspace/${scenario}.blocker.err" >&2
        exit 1
    fi

    worker "$action_a" "$owner" "$operation" \
        >"$workspace/${scenario}.a.out" \
        2>"$workspace/${scenario}.a.err" &
    local pid_a=$!

    worker "$action_b" "$owner" "$operation" \
        >"$workspace/${scenario}.b.out" \
        2>"$workspace/${scenario}.b.err" &
    local pid_b=$!

    # Confirm two independent sessions are waiting on PostgreSQL locks.
    # This avoids falsely treating sequential requests as a race test.

    local observed=0
    local waiting

    for ((i=0; i<100; i++)); do
        waiting="$(sql -c "
            SELECT COUNT(*)
            FROM pg_stat_activity
            WHERE datname = current_database()
              AND wait_event_type = 'Lock'
              AND query LIKE '%$operation%'
              AND (
                  query LIKE '%capture_reserved_wallet_transfer%'
                  OR query LIKE '%release_reserved_wallet_transfer%'
              );
        ")"

        if [[ "$waiting" -ge 2 ]]; then
            observed=1
            break
        fi

        sleep 0.05
    done

    if [[ "$observed" -ne 1 ]]; then
        echo "FAIL: Two simultaneous lock waiters were not observed" >&2
        exit 1
    fi

    local rc_a=0
    local rc_b=0

    wait "$pid_a" || rc_a=$?
    wait "$pid_b" || rc_b=$?
    wait "$blocker_pid"

    local output_a="$workspace/${scenario}.a.out"
    local output_b="$workspace/${scenario}.b.out"
    local error_a="$workspace/${scenario}.a.err"
    local error_b="$workspace/${scenario}.b.err"

    case "$scenario" in
        capture_release)
            if [[ "$rc_a" -eq 0 && "$rc_b" -ne 0 ]]; then
                grep -Fxq 'CAPTURED' "$output_a"
                grep -q 'P5421' "$error_b"
            elif [[ "$rc_b" -eq 0 && "$rc_a" -ne 0 ]]; then
                grep -Fxq 'RELEASED' "$output_b"
                grep -q 'P5415' "$error_a"
            else
                echo "FAIL: Capture/release race produced invalid outcomes" >&2
                cat "$output_a" "$output_b" "$error_a" "$error_b" >&2
                exit 1
            fi
            ;;

        capture_capture)
            [[ "$rc_a" -eq 0 && "$rc_b" -eq 0 ]] || {
                echo "FAIL: Concurrent capture produced an SQL failure" >&2
                cat "$error_a" "$error_b" >&2
                exit 1
            }

            if ! (
                grep -Fxq 'CAPTURED' "$output_a" &&
                grep -Fxq 'ALREADY_CAPTURED' "$output_b"
            ) && ! (
                grep -Fxq 'ALREADY_CAPTURED' "$output_a" &&
                grep -Fxq 'CAPTURED' "$output_b"
            ); then
                echo "FAIL: Capture replay was not idempotent" >&2
                exit 1
            fi
            ;;

        release_release)
            [[ "$rc_a" -eq 0 && "$rc_b" -eq 0 ]] || {
                echo "FAIL: Concurrent release produced an SQL failure" >&2
                cat "$error_a" "$error_b" >&2
                exit 1
            }

            if ! (
                grep -Fxq 'RELEASED' "$output_a" &&
                grep -Fxq 'ALREADY_RELEASED' "$output_b"
            ) && ! (
                grep -Fxq 'ALREADY_RELEASED' "$output_a" &&
                grep -Fxq 'RELEASED' "$output_b"
            ); then
                echo "FAIL: Release replay was not idempotent" >&2
                exit 1
            fi
            ;;
    esac

    echo "PASS: $scenario — competing sessions safely resolved"
}

run_race capture_release capture release
run_race capture_capture capture capture
run_race release_release release release

# ============================================================================
# Independently verify final financial states, posted amounts and events.
# ============================================================================

sql <<'SQL'
DO $$
DECLARE
    v RECORD;
    v_state TEXT;
    v_reservation_status TEXT;
    v_posted_journals BIGINT;
    v_settlement_events BIGINT;
    v_release_events BIGINT;
    v_source_balance NUMERIC;
    v_destination_balance NUMERIC;
    v_held_amount NUMERIC;
BEGIN
    FOR v IN
        SELECT *
        FROM public.pay54_ci_lifecycle_races
    LOOP
        SELECT state INTO v_state
        FROM pay54.financial_operations
        WHERE id = v.operation_id;

        SELECT status INTO v_reservation_status
        FROM pay54.balance_reservations
        WHERE operation_id = v.operation_id;

        SELECT COUNT(*) INTO v_posted_journals
        FROM pay54.ledger_journals
        WHERE operation_id = v.operation_id
          AND journal_type = 'TRANSFER'
          AND status = 'POSTED';

        SELECT COUNT(*) INTO v_settlement_events
        FROM pay54.outbox_events
        WHERE aggregate_id = v.operation_id
          AND event_type = 'financial.operation.settled.v1';

        SELECT COUNT(*) INTO v_release_events
        FROM pay54.outbox_events
        WHERE aggregate_id = v.operation_id
          AND event_type =
              'financial.operation.reservation_released.v1';

        SELECT posted_minor INTO v_source_balance
        FROM pay54.posted_account_balances
        WHERE account_id = v.source_account;

        SELECT posted_minor INTO v_destination_balance
        FROM pay54.posted_account_balances
        WHERE account_id = v.destination_account;

        SELECT COALESCE(SUM(amount_minor), 0)
        INTO v_held_amount
        FROM pay54.balance_reservations
        WHERE account_id = v.source_account
          AND status = 'HELD';

        IF v_held_amount <> 0 THEN
            RAISE EXCEPTION
                'FAIL: Residual HELD funds for %', v.scenario;
        END IF;

        IF v_state = 'SETTLED' THEN
            IF v_reservation_status <> 'CAPTURED'
               OR v_posted_journals <> 1
               OR v_settlement_events <> 1
               OR v_release_events <> 0
               OR v_source_balance <> 4000
               OR v_destination_balance <> 6000
            THEN
                RAISE EXCEPTION
                    'FAIL: Inconsistent settled result for %',
                    v.scenario;
            END IF;

        ELSIF v_state = 'FAILED' THEN
            IF v_reservation_status <> 'RELEASED'
               OR v_posted_journals <> 0
               OR v_settlement_events <> 0
               OR v_release_events <> 1
               OR v_source_balance <> 10000
               OR v_destination_balance <> 0
            THEN
                RAISE EXCEPTION
                    'FAIL: Inconsistent released result for %',
                    v.scenario;
            END IF;

        ELSE
            RAISE EXCEPTION
                'FAIL: Unexpected final state % for %',
                v_state, v.scenario;
        END IF;

        IF v.scenario = 'capture_capture'
           AND v_state <> 'SETTLED' THEN
            RAISE EXCEPTION
                'FAIL: Double-capture scenario did not settle';
        END IF;

        IF v.scenario = 'release_release'
           AND v_state <> 'FAILED' THEN
            RAISE EXCEPTION
                'FAIL: Double-release scenario did not release';
        END IF;

        RAISE NOTICE
            'PASS: % final accounting and event invariants',
            v.scenario;
    END LOOP;
END;
$$;
SQL

echo "PASS: PAY54 capture/release concurrency suite completed"
echo "Financial HTTP execution remains disabled"
