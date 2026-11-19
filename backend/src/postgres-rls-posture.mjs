"use strict";

/**
 * PAY54 Batch 22 / 824 — PostgreSQL catalogue proof of restricted runtime role.
 *
 * A caller-supplied rlsEnforced flag is NOT accepted as proof. This function
 * asks PostgreSQL whether the current transaction's role is non-superuser,
 * NOBYPASSRLS, SELECT-only, and the actual relations have forced RLS.
 * The caller must still independently verify policies via tenant tests.
 */
const ALLOWED = new Set([
  "account_contexts", "account_memberships", "auth_sessions"
]);
const deny = () => { throw new Error("PAY54_PG_RLS_POSTURE_DENIED"); };

export const PAY54_PG_POSTURE_SQL = `SELECT current_user AS runtime_role,
 (SELECT NOT rolsuper AND NOT rolbypassrls
  FROM pg_roles WHERE rolname = current_user) AS restricted,
 COUNT(*)::int AS table_count,
 COALESCE(bool_and(c.relrowsecurity AND c.relforcerowsecurity), false) AS forced_rls,
 COALESCE(bool_and(has_table_privilege(current_user, c.oid, 'SELECT')), false) AS can_select,
 COALESCE(bool_or(
   has_table_privilege(current_user, c.oid, 'INSERT')
   OR has_table_privilege(current_user, c.oid, 'UPDATE')
   OR has_table_privilege(current_user, c.oid, 'DELETE')
   OR has_table_privilege(current_user, c.oid, 'TRUNCATE')
   OR has_table_privilege(current_user, c.oid, 'REFERENCES')
   OR has_table_privilege(current_user, c.oid, 'TRIGGER')
 ), true) AS can_write
 FROM pg_class c
 JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'pay54'
   AND c.relkind IN ('r', 'p')
   AND c.relname = ANY($1::text[])`;

export async function assertPay54PostgresReadRole({ client, tables } = {}) {
  if (!client || typeof client.query !== "function" ||
      !Array.isArray(tables) ||
      tables.length < 1 || tables.length > 3 ||
      tables.some(name => !ALLOWED.has(name)) ||
      new Set(tables).size !== tables.length) deny();
  try {
    const result = await client.query(PAY54_PG_POSTURE_SQL, [tables]);
    const row = result?.rows?.[0];
    if (result.rows.length !== 1 ||
        typeof row.runtime_role !== "string" || !row.runtime_role ||
        row.restricted !== true ||
        Number(row.table_count) !== tables.length ||
        row.forced_rls !== true ||
        row.can_select !== true ||
        row.can_write !== false) deny();
  } catch { deny(); }

  return Object.freeze({
    schema: "pay54.pg-runtime-read-role-posture.v1",
    checkedTables: Object.freeze([...tables]),
    rolePropertiesCheckedAgainstPgCatalogue: true,
    liveTenantIsolationStillRequiresIndependentTests: true,
    productionReleaseAuthorised: false
  });
}
