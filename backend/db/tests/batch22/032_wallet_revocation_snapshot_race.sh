#!/usr/bin/env bash
set -euo pipefail
: "${POSTGRES_CONTAINER:?Disposable PostgreSQL container required}"
if [[ "${PAY54_ENVIRONMENT:-}" != "DISPOSABLE_CI" ||
      "${PAY54_FINANCIAL_EXECUTION:-}" != "false" ]]; then
  echo "PAY54_REVOKE_RACE_NOT_DISPOSABLE" >&2
  exit 1
fi
PSQL=(docker exec -i "$POSTGRES_CONTAINER" psql -U postgres -d pay54_disposable_ci -X -v ON_ERROR_STOP=1)
a_log="$(mktemp)"
b_log="$(mktemp)"
trap 'rm -f "$a_log" "$b_log"' EXIT

# Synthetic fixture in disposable PG16 only, no production data or tokens.
"${PSQL[@]}" <<'SQL'
INSERT INTO pay54.account_contexts
 (id,legal_owner_subject,account_type,display_name,status,verification_status)
VALUES ('b3700000-0000-4000-8000-000000000001',
'b3700000-0000-4000-8000-000000000002','PERSONAL',
'Batch37 Revocation Race','ACTIVE','VERIFIED');
INSERT INTO pay54.account_memberships(account_id,principal_subject,role,status)
VALUES ('b3700000-0000-4000-8000-000000000001',
'b3700000-0000-4000-8000-000000000002','PERSONAL_OWNER','ACTIVE');
INSERT INTO pay54.auth_sessions
 (session_id,principal_id,token_digest,csrf_digest,active_account_id,
  session_status,session_version,issued_at,expires_at)
VALUES ('b3700000-0000-4000-8000-000000000003',
'b3700000-0000-4000-8000-000000000002',
decode(repeat('b7',32),'hex'),decode(repeat('c7',32),'hex'),
'b3700000-0000-4000-8000-000000000001',
'ACTIVE',1,clock_timestamp()-interval '1 minute',
clock_timestamp()+interval '1 hour');
SQL

# Connection A takes a genuine REPEATABLE READ snapshot, holding it open.
(
"${PSQL[@]}" <<'SQL'
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='12s';
SELECT 1/(CASE WHEN COUNT(*)=1 THEN 1 ELSE 0 END) AS initial_active
FROM pay54.auth_sessions WHERE
 session_id='b3700000-0000-4000-8000-000000000003'
 AND session_status='ACTIVE' AND session_version=1;
\echo PAY54_B37_SNAPSHOT_READY
SELECT pg_sleep(4);
-- PostgreSQL is expected to keep the old snapshot here.
SELECT 1/(CASE WHEN COUNT(*)=1 THEN 1 ELSE 0 END) AS snapshot_is_stale
FROM pay54.auth_sessions WHERE
 session_id='b3700000-0000-4000-8000-000000000003'
 AND session_status='ACTIVE' AND session_version=1;
COMMIT;
SQL
) >"$a_log" 2>&1 &
a_pid=$!
ready=0
for attempt in $(seq 1 80); do
  if grep -q PAY54_B37_SNAPSHOT_READY "$a_log"; then ready=1; break; fi
  if ! kill -0 "$a_pid" 2>/dev/null; then break; fi
  sleep 0.1
done
if [[ "$ready" != 1 ]]; then
  cat "$a_log" >&2
  wait "$a_pid" || true
  echo "PAY54_B37_INITIAL_SNAPSHOT_FAILED" >&2
  exit 1
fi

# Connection B commits a revocation and principal account-switch fence
# before A is allowed to reuse the first snapshot.
"${PSQL[@]}" <<'SQL' >"$b_log" 2>&1
BEGIN;
SET LOCAL statement_timeout='10s';
UPDATE pay54.auth_sessions SET session_status='REVOKED',
 session_version=2,revoked_at=clock_timestamp()
WHERE session_id='b3700000-0000-4000-8000-000000000003'
 AND session_status='ACTIVE' AND session_version=1;
SELECT 1/(CASE WHEN COUNT(*)=1 THEN 1 ELSE 0 END) AS revocation_updated
FROM pay54.auth_sessions WHERE
 session_id='b3700000-0000-4000-8000-000000000003'
 AND session_status='REVOKED' AND session_version=2;
COMMIT;
SQL
wait "$a_pid" || { cat "$a_log" "$b_log" >&2; exit 1; }
grep -q snapshot_is_stale "$a_log" || { cat "$a_log" >&2; exit 1; }
grep -q revocation_updated "$b_log" || { cat "$b_log" >&2; exit 1; }

# Independent third connection MUST see the committed state, not A's snapshot.
"${PSQL[@]}" <<'SQL'
BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY;
SELECT 1/(CASE WHEN COUNT(*)=0 THEN 1 ELSE 0 END)
 AS fresh_session_is_not_active
FROM pay54.auth_sessions
WHERE session_id='b3700000-0000-4000-8000-000000000003'
 AND session_status='ACTIVE' AND session_version=1;
SELECT 1/(CASE WHEN COUNT(*)=1 THEN 1 ELSE 0 END)
 AS fresh_revocation_is_visible
FROM pay54.auth_sessions
WHERE session_id='b3700000-0000-4000-8000-000000000003'
 AND session_status='REVOKED' AND session_version=2;
COMMIT;
SQL
echo "PAY54 B37: Two-connection RR stale snapshot demonstrated; fresh session check rejects revoked session."
