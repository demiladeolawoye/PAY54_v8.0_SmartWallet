#!/usr/bin/env bash
set -euo pipefail
: "${POSTGRES_CONTAINER:?POSTGRES_CONTAINER must identify disposable PostgreSQL service}"
DATABASE=pay54_disposable_ci
PSQL=(docker exec -i "$POSTGRES_CONTAINER" psql -U postgres -d "$DATABASE" -X -v ON_ERROR_STOP=1)
"${PSQL[@]}" <<'SQL'
INSERT INTO pay54.wallets(id,owner_subject,market_code,status)
VALUES
 ('cccccccc-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','GB','ACTIVE'),
 ('dddddddd-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222222','GB','ACTIVE');
INSERT INTO pay54.personal_wallet_bindings(wallet_id,account_id)
VALUES
 ('cccccccc-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111'),
 ('dddddddd-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222222');
SQL
first_log="$(mktemp)"
second_log="$(mktemp)"
trap 'rm -f "$first_log" "$second_log"' EXIT

# Session A holds the new alias's uncommitted unique-index entry.
(
  "${PSQL[@]}" <<'SQL'
BEGIN;
INSERT INTO pay54.paytag_registry
(tag_id,canonical_alias,owner_account_id,wallet_id,owner_principal_id,registry_state)
VALUES
('cccccccc-aaaa-4aaa-8aaa-aaaaaaaaaaa1','p2b_race_guard',
 '11111111-1111-4111-8111-111111111111',
 'cccccccc-1111-4111-8111-111111111111',
 '11111111-1111-4111-8111-111111111111','RESERVED');
SELECT pg_sleep(5);
COMMIT;
SQL
) >"$first_log" 2>&1 &
first_pid=$!

# Verify A has finished INSERT and begun holding the uncommitted row.
ready=0
for attempt in $(seq 1 50); do
  if grep -q 'INSERT 0 1' "$first_log"; then ready=1; break; fi
  if ! kill -0 "$first_pid" 2>/dev/null; then break; fi
  sleep 0.1
done
if [[ "$ready" != 1 ]]; then
  cat "$first_log" >&2
  echo "P2B concurrency setup did not reach uncommitted INSERT" >&2
  wait "$first_pid" || true
  exit 1
fi

# Session B attempts the same immutable alias for another verified owner.
# PostgreSQL UNIQUE arbitration must block then reject B after A commits.
set +e
"${PSQL[@]}" <<'SQL' >"$second_log" 2>&1
BEGIN;
SET LOCAL lock_timeout = '12s';
INSERT INTO pay54.paytag_registry
(canonical_alias,owner_account_id,wallet_id,owner_principal_id,registry_state)
VALUES
('p2b_race_guard',
 '22222222-2222-4222-8222-222222222222',
 'dddddddd-2222-4222-8222-222222222222',
 '22222222-2222-4222-8222-222222222222','RESERVED');
COMMIT;
SQL
second_rc=$?
wait "$first_pid"
first_rc=$?
set -e

if [[ "$first_rc" != 0 ]] || [[ "$second_rc" == 0 ]] ||
   ! grep -q 'duplicate key value violates unique constraint' "$second_log"; then
  echo "PayTag concurrent claim did not fail closed" >&2
  cat "$first_log" "$second_log" >&2
  exit 1
fi

"${PSQL[@]}" <<'SQL'
DO $assert$
BEGIN
  IF (SELECT count(*) FROM pay54.paytag_registry
      WHERE canonical_alias='p2b_race_guard') <> 1
    OR (SELECT count(*) FROM pay54.paytag_registry
      WHERE canonical_alias='p2b_race_guard'
        AND owner_account_id='11111111-1111-4111-8111-111111111111') <> 1
    OR (SELECT count(*) FROM pay54.paytag_registry_audit
      WHERE tag_id='cccccccc-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
        AND event_kind='CLAIMED') <> 1
  THEN RAISE EXCEPTION 'PAYTAG_CONCURRENT_CLAIM_INTEGRITY_BROKEN'; END IF;
END
$assert$;
SQL
echo "P2B concurrent same-alias claim: 1 winner, 1 rejected, 1 audit record"
