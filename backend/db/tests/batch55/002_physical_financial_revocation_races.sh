#!/usr/bin/env bash
# PAY54 Batch55: two real PostgreSQL connections per revocation/posting race.
set -Eeuo pipefail
: "$POSTGRES_CONTAINER"
[[ "$PAY54_ENVIRONMENT" == DISPOSABLE_CI ]] || exit 31
[[ "$PAY54_FINANCIAL_EXECUTION" == false ]] || exit 32
[[ "$GITHUB_EVENT_NAME" == pull_request ]] || exit 33
db(){ docker exec -i "$POSTGRES_CONTAINER" psql -U postgres -d pay54_disposable_ci -X -v ON_ERROR_STOP=1 -At "$@"; }
tmp="$(mktemp -d)"
pid_a=""; pid_b=""; created=0
cleanup() {
 local code=$?
 trap - EXIT
 [[ -z "$pid_a" ]] || kill "$pid_a" 2>/dev/null || true
 [[ -z "$pid_b" ]] || kill "$pid_b" 2>/dev/null || true
 if [[ "$created" == 1 ]]; then
  db <<'SQL' || code=1
DO $guard$ BEGIN
 IF current_database()<>'pay54_disposable_ci'
 THEN RAISE EXCEPTION 'PAY54_B55_TEARDOWN_REFUSED'; END IF;
END $guard$;
DROP SCHEMA IF EXISTS pay54_b55 CASCADE;
DROP ROLE IF EXISTS pay54_b55_writer;
SELECT 1/(CASE WHEN to_regnamespace('pay54_b55') IS NULL
AND NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='pay54_b55_writer')
THEN 1 ELSE 0 END);
SQL
 fi
 rm -rf "$tmp"
 exit "$code"
}
trap cleanup EXIT
db < backend/db/tests/batch55/001_physical_financial_races_setup.sql
created=1
db <<'SQL'
DO $pre$ BEGIN
 IF current_database()<>'pay54_disposable_ci'
 OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='pay54_b55_writer'
   AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls)
 OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='pay54_b55.sessions'::regclass
   AND relrowsecurity AND relforcerowsecurity)
 THEN RAISE EXCEPTION 'PAY54_B55_PRECONDITION_FAILED'; END IF;
END $pre$;
SQL
marker() {
 local file="$1" wanted="$2" pid="$3"
 for i in $(seq 1 120); do
  grep -Fq "$wanted" "$file" && return 0
  kill -0 "$pid" 2>/dev/null || break
  sleep 0.05
 done
 cat "$file" >&2
 echo "PAY54_B55_MARKER_MISSING:$wanted" >&2
 exit 41
}
blocked() {
 local sid="$1" count
 for i in $(seq 1 120); do
  count="$(db -c "SELECT count(*) FROM pg_stat_activity
   WHERE datname='pay54_disposable_ci' AND wait_event_type='Lock'
   AND query LIKE '%$sid%' AND pid<>pg_backend_pid()")"
  if [[ "$count" =~ ^[0-9]+$ ]] && ((count>0)); then return 0; fi
  sleep 0.05
 done
 echo "PAY54_B55_NO_REAL_LOCK_WAIT:$sid" >&2
 exit 42
}
# Case 1: writer holds the session lock and its uncommitted posting/outbox.
(
db <<'SQL'
BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL ROLE pay54_b55_writer;
SET LOCAL statement_timeout='20s';
SELECT 1/(CASE WHEN count(*)=1 THEN 1 ELSE 0 END) FROM
(SELECT pay54_b55.execute_synthetic_transfer(
'b5500000-0000-4000-8000-000000000001',
'b5500000-0000-4000-8000-000000000101',
'b5500000-0000-4000-8000-000000000102',
2500,'batch55-writer-first-0001',repeat('a',64))) x;
\echo PAY54_B55_WRITER_LOCK_HELD
SELECT pg_sleep(5);
COMMIT;
\echo PAY54_B55_WRITER_COMMITTED
SQL
) > "$tmp/writer-a.log" 2>&1 &
pid_a=$!
marker "$tmp/writer-a.log" PAY54_B55_WRITER_LOCK_HELD "$pid_a"
(
db <<'SQL'
BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL statement_timeout='20s';
UPDATE pay54_b55.sessions SET status='REVOKED',version=2
WHERE id='b5500000-0000-4000-8000-000000000001'
AND status='ACTIVE' AND version=1;
COMMIT;
\echo PAY54_B55_REVOKER_AFTER_WRITER
SQL
) > "$tmp/revoke-a.log" 2>&1 &
pid_b=$!
blocked b5500000-0000-4000-8000-000000000001
wait "$pid_a" || { cat "$tmp/writer-a.log" >&2; exit 43; }; pid_a=""
wait "$pid_b" || { cat "$tmp/revoke-a.log" >&2; exit 44; }; pid_b=""
grep -Fq PAY54_B55_WRITER_COMMITTED "$tmp/writer-a.log"
grep -Fq PAY54_B55_REVOKER_AFTER_WRITER "$tmp/revoke-a.log"
# Case 2: revocation obtains the session lock first. The posting must wait
# and fail with P5451 after READ COMMITTED row predicate re-evaluation.
(
db <<'SQL'
BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL statement_timeout='20s';
UPDATE pay54_b55.sessions SET status='REVOKED',version=2
WHERE id='b5500000-0000-4000-8000-000000000002'
AND status='ACTIVE' AND version=1;
\echo PAY54_B55_REVOKER_LOCK_HELD
SELECT pg_sleep(5);
COMMIT;
\echo PAY54_B55_REVOKER_FIRST_COMMITTED
SQL
) > "$tmp/revoke-b.log" 2>&1 &
pid_a=$!
marker "$tmp/revoke-b.log" PAY54_B55_REVOKER_LOCK_HELD "$pid_a"
(
db <<'SQL'
BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL ROLE pay54_b55_writer;
SET LOCAL statement_timeout='20s';
DO $attempt$
DECLARE rejected boolean:=false;
BEGIN
 BEGIN
  PERFORM pay54_b55.execute_synthetic_transfer(
   'b5500000-0000-4000-8000-000000000002',
   'b5500000-0000-4000-8000-000000000101',
   'b5500000-0000-4000-8000-000000000102',
   500,'batch55-revocation-first-0001',repeat('b',64));
 EXCEPTION WHEN SQLSTATE 'P5451' THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'PAY54_B55_REVOKED_POSTING_ACCEPTED'; END IF;
END $attempt$;
COMMIT;
\echo PAY54_B55_REVOKED_WRITER_DENIED
SQL
) > "$tmp/writer-b.log" 2>&1 &
pid_b=$!
blocked b5500000-0000-4000-8000-000000000002
wait "$pid_a" || { cat "$tmp/revoke-b.log" >&2; exit 45; }; pid_a=""
wait "$pid_b" || { cat "$tmp/writer-b.log" >&2; exit 46; }; pid_b=""
grep -Fq PAY54_B55_REVOKER_FIRST_COMMITTED "$tmp/revoke-b.log"
grep -Fq PAY54_B55_REVOKED_WRITER_DENIED "$tmp/writer-b.log"
# Independent post-commit verification of single posting and outbox.
db <<'SQL'
SELECT 1/(CASE WHEN
 (SELECT count(*) FROM pay54_b55.sessions WHERE status='REVOKED' AND version=2)=2
 AND (SELECT count(*) FROM pay54_b55.journals WHERE
      idempotency_key='batch55-writer-first-0001')=1
 AND (SELECT count(*) FROM pay54_b55.journals WHERE
      idempotency_key='batch55-revocation-first-0001')=0
 AND (SELECT count(*) FROM pay54_b55.outbox)=1
 AND (SELECT count(*) FROM pay54_b55.entries WHERE journal_id IN
  (SELECT id FROM pay54_b55.journals WHERE
   idempotency_key='batch55-writer-first-0001'))=2
 AND (SELECT coalesce(sum(amount_minor::numeric),0) FROM pay54_b55.entries
  WHERE journal_id IN(SELECT id FROM pay54_b55.journals WHERE
   idempotency_key='batch55-writer-first-0001'))=0
 AND (SELECT coalesce(sum(amount_minor::numeric),0) FROM pay54_b55.entries
  WHERE account_id='b5500000-0000-4000-8000-000000000101')=7500
 AND (SELECT coalesce(sum(amount_minor::numeric),0) FROM pay54_b55.entries
  WHERE account_id='b5500000-0000-4000-8000-000000000102')=2500
 THEN 1 ELSE 0 END);
SQL
echo "PAY54_B55_PASS: real restricted financial posting-versus-revocation races on synthetic ledger"
