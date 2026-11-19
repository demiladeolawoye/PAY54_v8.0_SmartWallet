#!/usr/bin/env bash
# PAY54 Batch 23 / 876 — adversarial concurrent rotate of same session.
# Disposable PostgreSQL only. Run LAST after Batch 23 SQL rollback tests.
set -euo pipefail
: "${PG_CONTAINER:?Disposable PostgreSQL container required}"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

attempt() {
  local id="$1" token_hex="$2" csrf_hex="$3" audit_id="$4"
  docker exec -i "$PG_CONTAINER" psql -X -U postgres -d pay54_batch23_ci \
    -v ON_ERROR_STOP=1 -c "
      SET ROLE pay54_session_rotate_role;
      SELECT * FROM pay54.rotate_account_context_session(
        decode(repeat('ab',32),'hex'),
        decode(repeat('cd',32),'hex'),
        '$id'::uuid,
        decode(repeat('$token_hex',32),'hex'),
        decode(repeat('$csrf_hex',32),'hex'),
        '33333333-3333-4333-8333-333333333333'::uuid,
        1,
        '77777777-7777-4777-8777-777777777777'::uuid,
        '$audit_id'::uuid,
        now() + interval '30 minutes'
      );
    "
}

attempt "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" "ef" "12" \
  "66666666-6666-4666-8666-666666666666" >"$tmp/one" 2>&1 &
p1=$!
attempt "cccccccc-cccc-4ccc-8ccc-cccccccccccc" "bd" "34" \
  "88888888-8888-4888-8888-888888888888" >"$tmp/two" 2>&1 &
p2=$!
success=0
if wait "$p1"; then success=$((success+1)); fi
if wait "$p2"; then success=$((success+1)); fi
if [ "$success" -ne 1 ]; then
  echo "PAY54 failed concurrent CAS: exactly one session rotation must commit" >&2
  cat "$tmp/one" "$tmp/two" >&2
  exit 1
fi

actual="$(docker exec -i "$PG_CONTAINER" psql -X -A -t -U postgres \
  -d pay54_batch23_ci -v ON_ERROR_STOP=1 -c "
  SELECT CASE WHEN
    (SELECT count(*) FROM pay54.auth_sessions
       WHERE session_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
         AND session_status='REVOKED')=1
    AND
    (SELECT count(*) FROM pay54.auth_sessions
       WHERE session_id IN (
         'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
         'cccccccc-cccc-4ccc-8ccc-cccccccccccc')
         AND session_status='ACTIVE' AND session_version=2)=1
    AND
    (SELECT count(*) FROM pay54.account_context_audit
       WHERE previous_session_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')=1
    THEN 'PASS' ELSE 'DENY' END;")"
test "$actual" = "PASS" || {
  echo "PAY54 concurrency left unexpected session/audit state" >&2
  exit 1
}
echo "PASS: exactly one old-session CAS, one replacement, one durable audit"
