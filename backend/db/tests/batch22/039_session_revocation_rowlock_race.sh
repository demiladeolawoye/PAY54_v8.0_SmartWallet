#!/usr/bin/env bash
set -Eeuo pipefail
test -n "$POSTGRES_CONTAINER"
test "$PAY54_ENVIRONMENT" = "DISPOSABLE_CI"
test "$PAY54_FINANCIAL_EXECUTION" = "false"
db(){ docker exec -i "$POSTGRES_CONTAINER" psql -U postgres -d pay54_disposable_ci -X -v ON_ERROR_STOP=1 -At "$@"; }
tmp="$(mktemp -d)"
pid_a=""; pid_b=""
cleanup(){
 if [[ -n "$pid_a" ]]; then kill "$pid_a" 2>/dev/null || true; fi
 if [[ -n "$pid_b" ]]; then kill "$pid_b" 2>/dev/null || true; fi
 rm -rf "$tmp"
}
trap cleanup EXIT
db <<'SQL'
DO $pre$
BEGIN
 IF current_database() <> 'pay54_disposable_ci'
 OR NOT (SELECT relforcerowsecurity FROM pg_class WHERE oid='pay54.auth_sessions'::regclass)
 THEN RAISE EXCEPTION 'PAY54_B49_DISPOSABLE_PRECONDITION_DENIED'; END IF;
END $pre$;
INSERT INTO pay54.account_contexts
(id,legal_owner_subject,account_type,display_name,status,verification_status)
VALUES
('b4900000-0000-4000-8000-000000000001','b4900000-0000-4000-8000-000000000011','PERSONAL','B49 A','ACTIVE','VERIFIED'),
('b4900000-0000-4000-8000-000000000002','b4900000-0000-4000-8000-000000000012','PERSONAL','B49 B','ACTIVE','VERIFIED');
INSERT INTO pay54.account_memberships
(account_id,principal_subject,role,status)
VALUES
('b4900000-0000-4000-8000-000000000001','b4900000-0000-4000-8000-000000000011','PERSONAL_OWNER','ACTIVE'),
('b4900000-0000-4000-8000-000000000002','b4900000-0000-4000-8000-000000000012','PERSONAL_OWNER','ACTIVE');
INSERT INTO pay54.auth_sessions
(session_id,principal_id,token_digest,csrf_digest,active_account_id,
session_status,session_version,issued_at,expires_at)
VALUES
('b4900000-0000-4000-8000-000000000101','b4900000-0000-4000-8000-000000000011',
decode(repeat('a9',32),'hex'),decode(repeat('b9',32),'hex'),
'b4900000-0000-4000-8000-000000000001','ACTIVE',1,
clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 hour'),
('b4900000-0000-4000-8000-000000000102','b4900000-0000-4000-8000-000000000012',
decode(repeat('c9',32),'hex'),decode(repeat('d9',32),'hex'),
'b4900000-0000-4000-8000-000000000002','ACTIVE',1,
clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 hour');
SQL
ready(){
 local log="$1" marker="$2" pid="$3"
 for i in $(seq 1 100); do
  if grep -Fq "$marker" "$log"; then return 0; fi
  if ! kill -0 "$pid" 2>/dev/null; then break; fi
  sleep 0.05
 done
 cat "$log" >&2; echo "PAY54_B49_READY_MISSING" >&2; exit 1
}
blocked(){
 local sid="$1" count
 for i in $(seq 1 100); do
  count="$(db -c "SELECT count(*) FROM pg_stat_activity WHERE
   datname=current_database() AND wait_event_type='Lock'
   AND query LIKE '%$sid%' AND pid<>pg_backend_pid()")"
  if [[ "$count" =~ ^[0-9]+$ ]] && ((count>0)); then return 0; fi
  sleep 0.05
 done
 echo "PAY54_B49_PHYSICAL_LOCK_NOT_OBSERVED" >&2; exit 1
}
(
db <<'SQL'
BEGIN;
SET LOCAL statement_timeout='20s';
SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END) FROM
(SELECT session_id FROM pay54.auth_sessions
 WHERE session_id='b4900000-0000-4000-8000-000000000101'
 AND session_status='ACTIVE' AND session_version=1 FOR UPDATE) s;
\echo PAY54_B49_CHECK_LOCK_HELD
SELECT pg_sleep(5);
COMMIT;
\echo PAY54_B49_CHECK_COMMITTED
SQL
) >"$tmp/a.log" 2>&1 &
pid_a=$!
ready "$tmp/a.log" PAY54_B49_CHECK_LOCK_HELD "$pid_a"
(
db <<'SQL'
BEGIN;
SET LOCAL statement_timeout='20s';
UPDATE pay54.auth_sessions SET session_status='REVOKED',
session_version=2,revoked_at=clock_timestamp()
WHERE session_id='b4900000-0000-4000-8000-000000000101'
AND session_status='ACTIVE' AND session_version=1;
COMMIT;
\echo PAY54_B49_REVOKE_COMMITTED
SQL
) >"$tmp/b.log" 2>&1 &
pid_b=$!
blocked b4900000-0000-4000-8000-000000000101
wait "$pid_a" || { cat "$tmp/a.log" >&2; exit 1; }; pid_a=""
wait "$pid_b" || { cat "$tmp/b.log" >&2; exit 1; }; pid_b=""
grep -Fq PAY54_B49_CHECK_COMMITTED "$tmp/a.log"
grep -Fq PAY54_B49_REVOKE_COMMITTED "$tmp/b.log"
(
db <<'SQL'
BEGIN;
SET LOCAL statement_timeout='20s';
UPDATE pay54.auth_sessions SET session_status='REVOKED',
session_version=2,revoked_at=clock_timestamp()
WHERE session_id='b4900000-0000-4000-8000-000000000102'
AND session_status='ACTIVE' AND session_version=1;
\echo PAY54_B49_REVOKE_LOCK_HELD
SELECT pg_sleep(5);
COMMIT;
\echo PAY54_B49_REVOKER_FIRST_COMMITTED
SQL
) >"$tmp/c.log" 2>&1 &
pid_a=$!
ready "$tmp/c.log" PAY54_B49_REVOKE_LOCK_HELD "$pid_a"
(
db <<'SQL'
BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL statement_timeout='20s';
SELECT 1/(CASE WHEN count(*)=0 THEN 1 ELSE 0 END) FROM
(SELECT session_id FROM pay54.auth_sessions
 WHERE session_id='b4900000-0000-4000-8000-000000000102'
 AND session_status='ACTIVE' AND session_version=1 FOR UPDATE) s;
COMMIT;
\echo PAY54_B49_CHECK_DENIED
SQL
) >"$tmp/d.log" 2>&1 &
pid_b=$!
blocked b4900000-0000-4000-8000-000000000102
wait "$pid_a" || { cat "$tmp/c.log" >&2; exit 1; }; pid_a=""
wait "$pid_b" || { cat "$tmp/d.log" >&2; exit 1; }; pid_b=""
grep -Fq PAY54_B49_REVOKER_FIRST_COMMITTED "$tmp/c.log"
grep -Fq PAY54_B49_CHECK_DENIED "$tmp/d.log"
db <<'SQL'
SELECT 1/(CASE WHEN count(*)=2 THEN 1 ELSE 0 END)
FROM pay54.auth_sessions WHERE session_id IN
('b4900000-0000-4000-8000-000000000101',
 'b4900000-0000-4000-8000-000000000102')
AND session_status='REVOKED' AND session_version=2 AND revoked_at IS NOT NULL;
SQL
echo "PAY54_B49_PASS: two actual PG16 lock order races, no financial execution"
