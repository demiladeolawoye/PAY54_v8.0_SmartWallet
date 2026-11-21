#!/usr/bin/env bash
set -euo pipefail
: "${POSTGRES_CONTAINER:?POSTGRES_CONTAINER must be disposable PostgreSQL}"
PSQL=(docker exec -i "$POSTGRES_CONTAINER" psql -U postgres -d pay54_disposable_ci -X -v ON_ERROR_STOP=1)
a_log="$(mktemp)"
b_log="$(mktemp)"
revoke_log="$(mktemp)"
claim_log="$(mktemp)"
trap 'rm -f "$a_log" "$b_log" "$revoke_log" "$claim_log"' EXIT

# All three identities have independently verified PERSONAL accounts,
# memberships, active wallets, one binding each and unique active sessions.
"${PSQL[@]}" <<'SQL'
INSERT INTO pay54.account_contexts
 (id,legal_owner_subject,account_type,display_name,status,verification_status)
VALUES
 ('f1601000-0000-4000-8000-000000000001','f1601000-0000-4000-8000-000000000001',
  'PERSONAL','PayTag Race Owner One','ACTIVE','VERIFIED'),
 ('f1601000-0000-4000-8000-000000000002','f1601000-0000-4000-8000-000000000002',
  'PERSONAL','PayTag Race Owner Two','ACTIVE','VERIFIED'),
 ('f1601000-0000-4000-8000-000000000003','f1601000-0000-4000-8000-000000000003',
  'PERSONAL','PayTag Revocation Owner','ACTIVE','VERIFIED');
INSERT INTO pay54.account_memberships (account_id,principal_subject,role,status)
SELECT id,legal_owner_subject,'PERSONAL_OWNER','ACTIVE'
FROM pay54.account_contexts WHERE id IN
 ('f1601000-0000-4000-8000-000000000001',
  'f1601000-0000-4000-8000-000000000002',
  'f1601000-0000-4000-8000-000000000003');
INSERT INTO pay54.wallets (id,owner_subject,market_code,status)
VALUES
 ('f1602000-0000-4000-8000-000000000001','f1601000-0000-4000-8000-000000000001','GB','ACTIVE'),
 ('f1602000-0000-4000-8000-000000000002','f1601000-0000-4000-8000-000000000002','GB','ACTIVE'),
 ('f1602000-0000-4000-8000-000000000003','f1601000-0000-4000-8000-000000000003','GB','ACTIVE');
INSERT INTO pay54.personal_wallet_bindings (wallet_id,account_id)
VALUES
 ('f1602000-0000-4000-8000-000000000001','f1601000-0000-4000-8000-000000000001'),
 ('f1602000-0000-4000-8000-000000000002','f1601000-0000-4000-8000-000000000002'),
 ('f1602000-0000-4000-8000-000000000003','f1601000-0000-4000-8000-000000000003');
INSERT INTO pay54.auth_sessions
 (session_id,principal_id,token_digest,csrf_digest,active_account_id,
  session_status,session_version,issued_at,expires_at)
VALUES
 ('f1603000-0000-4000-8000-000000000001','f1601000-0000-4000-8000-000000000001',
  decode(repeat('81',32),'hex'),decode(repeat('82',32),'hex'),
  'f1601000-0000-4000-8000-000000000001','ACTIVE',1,
  clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 hour'),
 ('f1603000-0000-4000-8000-000000000002','f1601000-0000-4000-8000-000000000002',
  decode(repeat('91',32),'hex'),decode(repeat('92',32),'hex'),
  'f1601000-0000-4000-8000-000000000002','ACTIVE',1,
  clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 hour'),
 ('f1603000-0000-4000-8000-000000000003','f1601000-0000-4000-8000-000000000003',
  decode(repeat('a1',32),'hex'),decode(repeat('a2',32),'hex'),
  'f1601000-0000-4000-8000-000000000003','ACTIVE',1,
  clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 hour');
SQL

# Session A commits a claim only after B has started a competing call.
(
"${PSQL[@]}" <<'SQL'
BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL statement_timeout='12s';
SET LOCAL ROLE pay54_paytag_register_role;
SELECT * FROM pay54.register_paytag_restricted(
 decode(repeat('81',32),'hex'),decode(repeat('82',32),'hex'),
 'f1603000-0000-4000-8000-000000000001',1,
 'f1601000-0000-4000-8000-000000000001',
 'f1601000-0000-4000-8000-000000000001',
 'pr60_cross_account_race',decode(repeat('83',32),'hex'),
 decode(repeat('84',32),'hex'),
 'f1604000-0000-4000-8000-000000000001',
 'f1604000-0000-4000-8000-000000000002');
\echo PR60_CROSS_ACCOUNT_A_READY
SELECT pg_sleep(4);
COMMIT;
SQL
) >"$a_log" 2>&1 &
a_pid=$!
ready=0
for attempt in $(seq 1 80); do
  if grep -q PR60_CROSS_ACCOUNT_A_READY "$a_log"; then ready=1; break; fi
  if ! kill -0 "$a_pid" 2>/dev/null; then break; fi
  sleep 0.1
done
if [[ "$ready" != 1 ]]; then
  cat "$a_log" >&2
  wait "$a_pid" || true
  echo "PR60 cross-account first claim did not reach lock" >&2
  exit 1
fi

set +e
"${PSQL[@]}" <<'SQL' >"$b_log" 2>&1
BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL statement_timeout='12s';
SET LOCAL ROLE pay54_paytag_register_role;
SELECT * FROM pay54.register_paytag_restricted(
 decode(repeat('91',32),'hex'),decode(repeat('92',32),'hex'),
 'f1603000-0000-4000-8000-000000000002',1,
 'f1601000-0000-4000-8000-000000000002',
 'f1601000-0000-4000-8000-000000000002',
 'pr60_cross_account_race',decode(repeat('93',32),'hex'),
 decode(repeat('94',32),'hex'),
 'f1604000-0000-4000-8000-000000000003',
 'f1604000-0000-4000-8000-000000000004');
COMMIT;
SQL
b_rc=$?
wait "$a_pid"
a_rc=$?
set -e
if [[ "$a_rc" != 0 || "$b_rc" == 0 ]] ||
 ! grep -Eq 'duplicate key value violates unique constraint|could not serialize access' "$b_log"; then
 cat "$a_log" "$b_log" >&2
 echo "PR60 cross-account same-alias arbitration failure" >&2
 exit 1
fi
"${PSQL[@]}" <<'SQL'
DO $assert$
BEGIN
 IF (SELECT count(*) FROM pay54.paytag_registry
   WHERE canonical_alias='pr60_cross_account_race')<>1
 OR (SELECT count(*) FROM pay54.paytag_registry
   WHERE canonical_alias='pr60_cross_account_race'
     AND owner_account_id='f1601000-0000-4000-8000-000000000001')<>1
 OR (SELECT count(*) FROM pay54.paytag_registration_requests
   WHERE canonical_alias='pr60_cross_account_race' AND request_state='COMMITTED')<>1
 OR (SELECT count(*) FROM pay54.paytag_registry_audit a
   JOIN pay54.paytag_registry r ON r.tag_id=a.tag_id
   WHERE r.canonical_alias='pr60_cross_account_race'
   AND a.event_kind='CLAIMED')<>1
 THEN RAISE EXCEPTION 'PR60_CROSS_ACCOUNT_AUDIT_FAILURE'; END IF;
END
$assert$;
SQL

# A committed revocation must win against any subsequent registration.
# Holding session row UPDATE makes the caller wait or serialize-abort.
(
"${PSQL[@]}" <<'SQL'
BEGIN;
UPDATE pay54.auth_sessions SET session_status='REVOKED',
 revoked_at=clock_timestamp(),session_version=2
WHERE session_id='f1603000-0000-4000-8000-000000000003';
\echo PR60_REVOKE_ROW_LOCK_READY
SELECT pg_sleep(4);
COMMIT;
SQL
) >"$revoke_log" 2>&1 &
revoke_pid=$!
ready=0
for attempt in $(seq 1 80); do
 if grep -q PR60_REVOKE_ROW_LOCK_READY "$revoke_log"; then ready=1; break; fi
 if ! kill -0 "$revoke_pid" 2>/dev/null; then break; fi
 sleep 0.1
done
if [[ "$ready" != 1 ]]; then
 cat "$revoke_log" >&2
 wait "$revoke_pid" || true
 echo "PR60 revocation row lock not established" >&2
 exit 1
fi
set +e
"${PSQL[@]}" <<'SQL' >"$claim_log" 2>&1
BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL statement_timeout='12s';
SET LOCAL ROLE pay54_paytag_register_role;
SELECT * FROM pay54.register_paytag_restricted(
 decode(repeat('a1',32),'hex'),decode(repeat('a2',32),'hex'),
 'f1603000-0000-4000-8000-000000000003',1,
 'f1601000-0000-4000-8000-000000000003',
 'f1601000-0000-4000-8000-000000000003',
 'pr60_revocation_race',decode(repeat('a3',32),'hex'),
 decode(repeat('a4',32),'hex'),
 'f1604000-0000-4000-8000-000000000005',
 'f1604000-0000-4000-8000-000000000006');
COMMIT;
SQL
claim_rc=$?
wait "$revoke_pid"
revoke_rc=$?
set -e
if [[ "$revoke_rc" != 0 || "$claim_rc" == 0 ]] ||
 ! grep -Eq 'could not serialize access|PAY54_PAYTAG_REGISTRATION_DENIED' "$claim_log"; then
 cat "$revoke_log" "$claim_log" >&2
 echo "PR60 revocation-in-flight claim must fail closed" >&2
 exit 1
fi
"${PSQL[@]}" <<'SQL'
DO $assert$
BEGIN
 IF EXISTS(SELECT 1 FROM pay54.paytag_registry
    WHERE canonical_alias='pr60_revocation_race')
 OR EXISTS(SELECT 1 FROM pay54.paytag_registration_requests
    WHERE canonical_alias='pr60_revocation_race')
 OR EXISTS(SELECT 1 FROM pay54.paytag_registry_audit a
    JOIN pay54.paytag_registry r ON r.tag_id=a.tag_id
    WHERE r.canonical_alias='pr60_revocation_race')
 OR NOT EXISTS (SELECT 1 FROM pay54.auth_sessions
    WHERE session_id='f1603000-0000-4000-8000-000000000003'
    AND session_status='REVOKED' AND session_version=2)
 THEN RAISE EXCEPTION 'PR60_REVOCATION_RACE_INTEGRITY_FAILED'; END IF;
END
$assert$;
SQL
echo "PR60 verified restricted role: cross-account uniqueness and revocation race."
