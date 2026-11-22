#!/usr/bin/env bash
set -euo pipefail
# PAY54 PR66: disposable PostgreSQL 16 TLS and credential rotation only.
: "${POSTGRES_CONTAINER:?Disposable CI service container required}"
if [[ "${PAY54_ENVIRONMENT:-}" != "DISPOSABLE_CI" ||
      "${PAY54_FINANCIAL_EXECUTION:-}" != "false" ||
      "${PAY54_PAYTAG_RUNTIME:-}" != "DISABLED" ]]; then
  echo "PAY54_TLS_ROTATION_CI_ONLY" >&2
  exit 1
fi
docker inspect "$POSTGRES_CONTAINER" --format '{{.State.Running}}' | grep -qx true

# Every certificate and credential is generated inside a throwaway container.
docker exec -i "$POSTGRES_CONTAINER" bash -s <<'PAY54_EPHEMERAL_TLS'
set -euo pipefail
umask 077
DIR="$(mktemp -d /tmp/pay54_tls_ci.XXXXXXXX)"
role="pay54_tls_ci_login"
cleanup(){
  su postgres -s /bin/sh -c "psql -X -q -U postgres -d pay54_disposable_ci -c 'DROP ROLE IF EXISTS pay54_tls_ci_login'" >/dev/null 2>&1 || true
  rm -rf "$DIR"
}
trap cleanup EXIT
openssl req -new -newkey rsa:2048 -nodes -x509 -sha256 -days 1 \
  -subj "/CN=PAY54 Disposable Test CA" \
  -keyout "$DIR/ca.key" -out "$DIR/ca.pem" >/dev/null 2>&1
openssl req -new -newkey rsa:2048 -nodes -sha256 \
  -subj "/CN=localhost" \
  -keyout "$DIR/server.key" -out "$DIR/server.csr" >/dev/null 2>&1
printf '%s\n' 'subjectAltName=DNS:localhost' 'extendedKeyUsage=serverAuth' > "$DIR/server.ext"
openssl x509 -req -sha256 -days 1 \
  -in "$DIR/server.csr" -CA "$DIR/ca.pem" -CAkey "$DIR/ca.key" \
  -CAcreateserial -extfile "$DIR/server.ext" \
  -out "$DIR/server.pem" >/dev/null 2>&1
openssl req -new -newkey rsa:2048 -nodes -x509 -sha256 -days 1 \
  -subj "/CN=Untrusted Disposable CA" \
  -keyout "$DIR/wrong.key" -out "$DIR/wrong.pem" >/dev/null 2>&1
chown postgres:postgres "$DIR/server.key" "$DIR/server.pem" "$DIR/ca.pem"
chmod 0600 "$DIR/server.key"
chmod 0644 "$DIR/server.pem" "$DIR/ca.pem"
chmod 0755 "$DIR"
su postgres -s /bin/sh -c "psql -X -q -U postgres -d pay54_disposable_ci" <<SQL
ALTER SYSTEM SET ssl = 'on';
ALTER SYSTEM SET ssl_cert_file = '$DIR/server.pem';
ALTER SYSTEM SET ssl_key_file = '$DIR/server.key';
SQL
HBA_FILE="$(su postgres -s /bin/sh -c "psql -X -At -U postgres -d pay54_disposable_ci -c 'SHOW hba_file'")"
test -f "$HBA_FILE"
sed -i '1ihostnossl all pay54_tls_ci_login 127.0.0.1/32 reject' "$HBA_FILE"
su postgres -s /bin/sh -c "psql -X -At -U postgres -d pay54_disposable_ci -c 'SELECT pg_reload_conf()'" | grep -qx t
sleep 1
su postgres -s /bin/sh -c "psql -X -At -U postgres -d pay54_disposable_ci -c 'SHOW ssl'" | grep -qx on

old_password="$(openssl rand -hex 32)"
new_password="$(openssl rand -hex 32)"
test "$old_password" != "$new_password"
printf "CREATE ROLE %s LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD '%s';\n" \
 "$role" "$old_password" |
  su postgres -s /bin/sh -c "psql -X -q -v ON_ERROR_STOP=1 -U postgres -d pay54_disposable_ci"

run_login(){
  local password="$1"
  shift
  PGPASSWORD="$password" PGSSLMODE=verify-full PGSSLROOTCERT="$DIR/ca.pem" \
    psql -X -A -t -v ON_ERROR_STOP=1 -U "$role" \
    -d "dbname=pay54_disposable_ci host=localhost hostaddr=127.0.0.1 port=5432" "$@"
}
test "$(run_login "$old_password" -c \
  'SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()')" = t

if PGPASSWORD="$old_password" PGSSLMODE=verify-full PGSSLROOTCERT="$DIR/ca.pem" \
  psql -X -q -v ON_ERROR_STOP=1 -U "$role" \
  -d "dbname=pay54_disposable_ci host=incorrect.internal.example hostaddr=127.0.0.1 port=5432" \
  -c 'SELECT 1' >/dev/null 2>&1; then
  echo "PAY54_TLS_HOSTNAME_NOT_VERIFIED" >&2
  exit 1
fi
if PGPASSWORD="$old_password" PGSSLMODE=verify-full PGSSLROOTCERT="$DIR/wrong.pem" \
  psql -X -q -v ON_ERROR_STOP=1 -U "$role" \
  -d "dbname=pay54_disposable_ci host=localhost hostaddr=127.0.0.1 port=5432" \
  -c 'SELECT 1' >/dev/null 2>&1; then
  echo "PAY54_TLS_WRONG_CA_ACCEPTED" >&2
  exit 1
fi
if PGPASSWORD="$old_password" PGSSLMODE=disable \
  psql -X -q -v ON_ERROR_STOP=1 -U "$role" \
  -d "dbname=pay54_disposable_ci host=localhost hostaddr=127.0.0.1 port=5432" \
  -c 'SELECT 1' >/dev/null 2>&1; then
  echo "PAY54_PLAINTEXT_DATABASE_CONNECTION_ACCEPTED" >&2
  exit 1
fi

printf "ALTER ROLE %s PASSWORD '%s';\n" "$role" "$new_password" |
  su postgres -s /bin/sh -c "psql -X -q -v ON_ERROR_STOP=1 -U postgres -d pay54_disposable_ci"
test "$(run_login "$new_password" -c \
  'SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()')" = t
if run_login "$old_password" -c 'SELECT 1' >/dev/null 2>&1; then
  echo "PAY54_ROTATED_CREDENTIAL_STILL_AUTHENTICATES" >&2
  exit 1
fi
test "$(run_login "$new_password" -c \
  "SELECT has_schema_privilege(current_user,'pay54','USAGE')")" = f
unset old_password new_password
echo "PASS PAY54 disposable verify-full TLS, negative peers, transport enforcement and rotation"
PAY54_EPHEMERAL_TLS
