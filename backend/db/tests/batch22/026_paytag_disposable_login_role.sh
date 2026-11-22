#!/usr/bin/env bash
set -euo pipefail
# PAY54 PR64 — DISPOSABLE CI ONLY. Does not attest TLS or real IAM.
: "\${POSTGRES_CONTAINER:?Disposable PostgreSQL service container required}"
if [[ "\${PAY54_ENVIRONMENT:-}" != "DISPOSABLE_CI" ||
      "\${PAY54_FINANCIAL_EXECUTION:-}" != "false" ]]; then
  echo PAY54_LOGIN_PROOF_ENVIRONMENT_DENIED >&2
  exit 1
fi
admin=(docker exec -i "$POSTGRES_CONTAINER" psql -U postgres -d pay54_disposable_ci -X -v ON_ERROR_STOP=1)
login=(docker exec -i "$POSTGRES_CONTAINER" psql -U pay54_paytag_ci_login -d pay54_disposable_ci -X -v ON_ERROR_STOP=1)
error_log="$(mktemp)"
trap 'rm -f "$error_log"' EXIT

# Local-socket trust in the ephemeral official PostgreSQL image is NOT
# representative of production credentials or network authentication.
"\${admin[@]}" <<'SQL'
DO $before$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='pay54_paytag_ci_login')
 THEN RAISE EXCEPTION 'PAY54_CI_LOGIN_ALREADY_EXISTS'; END IF;
END $before$;
CREATE ROLE pay54_paytag_ci_login LOGIN NOINHERIT
 NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION
 PASSWORD NULL;
GRANT pay54_paytag_register_role TO pay54_paytag_ci_login
 WITH ADMIN FALSE, INHERIT FALSE, SET TRUE;
DO $assert$
DECLARE member_oid oid; caller_oid oid;
BEGIN
 SELECT oid INTO member_oid FROM pg_roles WHERE rolname='pay54_paytag_ci_login';
 SELECT oid INTO caller_oid FROM pg_roles WHERE rolname='pay54_paytag_register_role';
 IF NOT EXISTS (
  SELECT 1 FROM pg_auth_members WHERE member=member_oid AND roleid=caller_oid
    AND NOT admin_option AND NOT inherit_option AND set_option
 ) OR (SELECT count(*) FROM pg_auth_members WHERE member=member_oid)<>1
 OR has_schema_privilege('pay54_paytag_ci_login','pay54','USAGE')
 OR has_table_privilege('pay54_paytag_ci_login','pay54.auth_sessions','SELECT')
 OR has_function_privilege('pay54_paytag_ci_login',
  'pay54.register_paytag_restricted(bytea,bytea,uuid,bigint,uuid,uuid,text,bytea,bytea,uuid,uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'PAY54_CI_LOGIN_INHERITED_AUTHORITY'; END IF;
END $assert$;
SQL

# An actual new PostgreSQL connection authenticated as the disposable login.
"\${login[@]}" <<'SQL'
DO $assert$
BEGIN
 IF session_user<>'pay54_paytag_ci_login' OR current_user<>session_user
 OR has_schema_privilege(current_user,'pay54','USAGE')
 THEN RAISE EXCEPTION 'PAY54_CI_LOGIN_UNSWITCHED_AUTHORITY'; END IF;
END $assert$;
BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE;
SET LOCAL ROLE pay54_paytag_register_role;
DO $assert$
BEGIN
 IF session_user<>'pay54_paytag_ci_login'
 OR current_user<>'pay54_paytag_register_role'
 OR NOT has_function_privilege(current_user,
  'pay54.register_paytag_restricted(bytea,bytea,uuid,bigint,uuid,uuid,text,bytea,bytea,uuid,uuid)','EXECUTE')
 OR has_function_privilege(current_user,
  'pay54.register_paytag_trusted(bytea,bytea,uuid,bigint,uuid,uuid,text,bytea,bytea,uuid,uuid)','EXECUTE')
 OR has_table_privilege(current_user,'pay54.auth_sessions','SELECT')
 OR has_table_privilege(current_user,'pay54.paytag_registry','INSERT')
 OR has_table_privilege(current_user,'pay54.paytag_registry_audit','INSERT')
 OR has_table_privilege(current_user,'pay54.ledger_entries','INSERT')
 THEN RAISE EXCEPTION 'PAY54_CI_LOGIN_SWITCHED_AUTHORITY'; END IF;
END $assert$;
COMMIT;
DO $assert$
BEGIN
 IF current_user<>'pay54_paytag_ci_login' OR current_user<>session_user
 OR has_schema_privilege(current_user,'pay54','USAGE')
 THEN RAISE EXCEPTION 'PAY54_CI_LOGIN_ROLE_LEAK_AFTER_COMMIT'; END IF;
END $assert$;
BEGIN;
SET LOCAL ROLE pay54_paytag_register_role;
DO $assert$
DECLARE denied boolean:=FALSE;
BEGIN
 BEGIN
  PERFORM 1 FROM pay54.auth_sessions LIMIT 1;
 EXCEPTION WHEN insufficient_privilege THEN denied:=TRUE;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'PAY54_CI_LOGIN_DIRECT_SESSION_ACCESS'; END IF;
END $assert$;
ROLLBACK;
DO $assert$
BEGIN
 IF current_user<>'pay54_paytag_ci_login'
 THEN RAISE EXCEPTION 'PAY54_CI_LOGIN_ROLE_LEAK_AFTER_ROLLBACK'; END IF;
END $assert$;
SQL

"\${admin[@]}" <<'SQL'
REVOKE pay54_paytag_register_role FROM pay54_paytag_ci_login;
SQL
# Revoked membership cannot SET ROLE in a new physical session.
if "\${login[@]}" -c 'SET ROLE pay54_paytag_register_role;' >"$error_log" 2>&1; then
  echo PAY54_CI_REVOKED_MEMBERSHIP_STILL_WORKS >&2
  exit 1
fi
"\${admin[@]}" <<'SQL'
DROP ROLE pay54_paytag_ci_login;
DO $assert$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='pay54_paytag_ci_login')
 OR EXISTS(SELECT 1 FROM pg_auth_members
    WHERE roleid=(SELECT oid FROM pg_roles
      WHERE rolname='pay54_paytag_register_role')
      OR member=(SELECT oid FROM pg_roles
      WHERE rolname='pay54_paytag_register_role'))
 THEN RAISE EXCEPTION 'PAY54_CI_LOGIN_CLEANUP_FAILED'; END IF;
END $assert$;
SQL
echo "PAY54 CI-only LOGIN/no-inheritance/role reset/revocation controls passed"
