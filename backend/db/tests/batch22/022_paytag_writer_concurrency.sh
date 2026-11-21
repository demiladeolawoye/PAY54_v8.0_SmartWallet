#!/usr/bin/env bash
set -euo pipefail
: "${POSTGRES_CONTAINER:?POSTGRES_CONTAINER must identify disposable PostgreSQL service}"
PSQL=(docker exec -i "$POSTGRES_CONTAINER" psql -U postgres -d pay54_disposable_ci -X -v ON_ERROR_STOP=1)
first_log="$(mktemp)"
second_log="$(mktemp)"
trap 'rm -f "$first_log" "$second_log"' EXIT

# Disposable CI fixture. Account two is a verified PERSONAL owner with one
# bound active wallet, prepared by canonical batch22 fixture 014.
"${PSQL[@]}" <<'SQL'
INSERT INTO pay54.auth_sessions
 (session_id,principal_id,token_digest,csrf_digest,active_account_id,
  session_status,session_version,issued_at,expires_at)
VALUES
 ('f1590000-0000-4000-8000-000000000011',
 '22222222-2222-4222-8222-222222222222',
 decode(repeat('b1',32),'hex'),decode(repeat('b2',32),'hex'),
 '22222222-2222-4222-8222-222222222222',
 'ACTIVE',1,clock_timestamp()-interval '1 minute',
 clock_timestamp()+interval '1 hour');
SQL

# A owns the session/account locks through commit. A's function result is
# buffered to a log before sleeping, ensuring B races an uncommitted claim.
(
"${PSQL[@]}" <<'SQL'
BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL statement_timeout='12s';
SELECT * FROM pay54.register_paytag_trusted(
 decode(repeat('b1',32),'hex'),decode(repeat('b2',32),'hex'),
 'f1590000-0000-4000-8000-000000000011',1,
 '22222222-2222-4222-8222-222222222222',
 '22222222-2222-4222-8222-222222222222',
 'pr59_race_first',decode(repeat('b3',32),'hex'),
 decode(repeat('b4',32),'hex'),
 'f1590000-0000-4000-8000-000000000012',
 'f1590000-0000-4000-8000-000000000013');
\\echo PR59_FIRST_CLAIM_READY
SELECT pg_sleep(4);
COMMIT;
SQL
) >"$first_log" 2>&1 &
first_pid=$!

ready=0
for attempt in $(seq 1 80); do
  if grep -q 'PR59_FIRST_CLAIM_READY' "$first_log"; then ready=1; break; fi
  if ! kill -0 "$first_pid" 2>/dev/null; then break; fi
  sleep 0.1
done
if [[ "$ready" != 1 ]]; then
  cat "$first_log" >&2
  echo "PAY54 writer concurrency setup did not acquire first claim" >&2
  wait "$first_pid" || true
  exit 1
fi

# B must fail closed: serialization conflict, already registered, or unique
# conflict are all acceptable. A timeout is a test failure, not validation.
set +e
"${PSQL[@]}" <<'SQL' >"$second_log" 2>&1
BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL statement_timeout='12s';
SELECT * FROM pay54.register_paytag_trusted(
 decode(repeat('b1',32),'hex'),decode(repeat('b2',32),'hex'),
 'f1590000-0000-4000-8000-000000000011',1,
 '22222222-2222-4222-8222-222222222222',
 '22222222-2222-4222-8222-222222222222',
 'pr59_race_second',decode(repeat('c3',32),'hex'),
 decode(repeat('c4',32),'hex'),
 'f1590000-0000-4000-8000-000000000014',
 'f1590000-0000-4000-8000-000000000015');
COMMIT;
SQL
second_rc=$?
wait "$first_pid"
first_rc=$?
set -e

if [[ "$first_rc" != 0 ]] || [[ "$second_rc" == 0 ]] ||
  ! grep -Eq 'could not serialize access|PAY54_PAYTAG_ALREADY_REGISTERED|duplicate key value violates unique constraint' "$second_log"; then
  cat "$first_log" "$second_log" >&2
  echo "PAY54 concurrent writer must have exactly one committed winner" >&2
  exit 1
fi

"${PSQL[@]}" <<'SQL'
DO $assert$
BEGIN
 IF (SELECT count(*) FROM pay54.paytag_registry
       WHERE canonical_alias IN ('pr59_race_first','pr59_race_second'))<>1
 OR (SELECT count(*) FROM pay54.paytag_registry
       WHERE canonical_alias='pr59_race_first'
         AND owner_account_id='22222222-2222-4222-8222-222222222222')<>1
 OR (SELECT count(*) FROM pay54.paytag_registration_requests
       WHERE owner_account_id='22222222-2222-4222-8222-222222222222'
         AND canonical_alias IN ('pr59_race_first','pr59_race_second')
         AND request_state='COMMITTED')<>1
 OR (SELECT count(*) FROM pay54.paytag_registry_audit a
       JOIN pay54.paytag_registry r ON r.tag_id=a.tag_id
       WHERE r.canonical_alias IN ('pr59_race_first','pr59_race_second')
         AND a.event_kind='CLAIMED')<>1
 THEN RAISE EXCEPTION 'PR59_CONCURRENT_WRITER_ATOMICITY_FAILURE'; END IF;
END
$assert$;
SQL
echo "PAY54 transactional writer: two connections, one committed claim, exact audit."
