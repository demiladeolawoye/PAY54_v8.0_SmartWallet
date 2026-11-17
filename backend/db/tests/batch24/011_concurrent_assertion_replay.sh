#!/usr/bin/env bash
# PAY54 Batch 24 / 950 — concurrent replay against PostgreSQL unique JTI.
# Disposable CI ONLY, run after all rollback-scoped SQL fixtures.
set -euo pipefail
: "${PG_CONTAINER:?disposable PostgreSQL container required}"
dir="$(mktemp -d)"
trap 'rm -rf "$dir"' EXIT

run(){
 local id="$1" digest="$2" csrf="$3"
 docker exec -i "$PG_CONTAINER" psql -X -U postgres -d pay54_batch24_ci \
  -v ON_ERROR_STOP=1 -c "
 SET ROLE pay54_session_issue_role;
 SELECT * FROM pay54.consume_identity_assertion_and_issue_bootstrap(
  'https://identity.pay54.example',
  '11111111-1111-4111-8111-111111111111',
  '99999999-9999-4999-8999-999999999999',
  now()+interval '2 minutes',
  '$id'::uuid,
  decode(repeat('$digest',32),'hex'),
  decode(repeat('$csrf',32),'hex')
 );"
}
run "aaaaaaaa-0000-4000-8000-000000000001" "71" "72" >"$dir/one" 2>&1 &
a=$!
run "aaaaaaaa-0000-4000-8000-000000000002" "73" "74" >"$dir/two" 2>&1 &
b=$!
success=0
if wait "$a";then success=$((success+1));fi
if wait "$b";then success=$((success+1));fi
if [ "$success" -ne 1 ];then
 echo "FAIL: expected exactly one consumed issuer/JTI under concurrent replay" >&2
 cat "$dir/one" "$dir/two" >&2
 exit 1
fi

result="$(docker exec -i "$PG_CONTAINER" psql -X -A -t \
 -U postgres -d pay54_batch24_ci -v ON_ERROR_STOP=1 -c "
 SELECT CASE WHEN
  (SELECT count(*) FROM pay54.identity_assertion_receipts
    WHERE issuer='https://identity.pay54.example'
      AND assertion_id='99999999-9999-4999-8999-999999999999')=1
 AND
  (SELECT count(*) FROM pay54.auth_sessions WHERE session_id IN(
   'aaaaaaaa-0000-4000-8000-000000000001',
   'aaaaaaaa-0000-4000-8000-000000000002'
  ) AND session_status='ACTIVE' AND active_account_id IS NULL)=1
 THEN 'PASS' ELSE 'DENY' END;")"
test "$result" = "PASS" || {
 echo "FAIL: duplicate bootstrap or missing assertion receipt" >&2
 exit 1
}
echo "PASS: one assertion JTI consumed, one short-lived unbound session"
