"use strict";

/**
 * PAY54 Batch 23 / 889 — independently inspected staging DB role probe.
 *
 * Uses existing, externally provisioned pool clients, never connects itself
 * or requests account data. Probes actual PostgreSQL role identity, FORCE
 * RLS and privileges in read-only transactions. This is necessary but NOT
 * sufficient for live session switching or a release decision.
 */
import { assertPay54PostgresReadRole }
  from "./postgres-rls-posture.mjs";
import { PAY54_ROTATION_SQL }
  from "./postgres-session-rotation.mjs";
import { PAY54_BOOTSTRAP_SQL }
  from "./postgres-bootstrap-issuer.mjs";

const deny = () => { throw new Error("PAY54_STAGING_ROLE_PROBE_DENIED"); };

async function probe(pool, expectedRole, tableNames, roleSql = null) {
  let client, started = false, discard = false;
  try {
    client = await pool.connect();
    if (!client || typeof client.query !== "function" ||
        typeof client.release !== "function") deny();
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    started = true;
    if (tableNames) {
      await assertPay54PostgresReadRole({ client, tables: tableNames });
    }
    const result = await client.query(tableNames
      ? "SELECT current_user AS role_name"
      : roleSql ?? PAY54_ROTATION_SQL.ROLE_SQL);
    const row = result?.rows?.[0];
    if (result?.rows?.length !== 1 || row.role_name !== expectedRole) deny();
    if (!tableNames) {
      const isIssuer = expectedRole === "pay54_session_issue_role";
      if (row.restricted !== true ||
          row.may_write_ledger !== false ||
          row.may_write_sessions !== false ||
          (isIssuer
            ? row.may_issue !== true || row.may_write_receipts !== false
            : row.may_rotate !== true || row.may_append_audit !== false))
        deny();
    }
    await client.query("COMMIT");
    started = false;
    return Object.freeze({ expectedRole, roleVerifiedInDatabase: true });
  } catch {
    if (client && started) {
      try { await client.query("ROLLBACK"); } catch { discard = true; }
    }
    deny();
  } finally {
    if (client) {
      try { client.release(discard); } catch { /* release failure */ }
    }
  }
}

export async function probePay54StagingDatabaseRoles({
  sessionReadPool, accountReadPool, sessionRotationPool
} = {}) {
  if (!sessionReadPool || !accountReadPool || !sessionRotationPool ||
      typeof sessionReadPool.connect !== "function" ||
      typeof accountReadPool.connect !== "function" ||
      typeof sessionRotationPool.connect !== "function" ||
      new Set([sessionReadPool, accountReadPool, sessionRotationPool]).size !== 3)
    deny();

  // No concurrency here; fail before touching other services when any one
  // isolated DB role is misprovisioned.
  const session = await probe(sessionReadPool,
    "pay54_session_read_role", ["auth_sessions"]);
  const account = await probe(accountReadPool,
    "pay54_account_directory_read_role",
    ["account_contexts", "account_memberships"]);
  const rotation = await probe(sessionRotationPool,
    "pay54_session_rotate_role", null);

  return Object.freeze({
    schema: "pay54.staging-database-role-probe.v1",
    sessionRole: session.expectedRole,
    accountRole: account.expectedRole,
    rotationRole: rotation.expectedRole,
    restrictedRolesVerified: true,
    tenantDataRead: false,
    customerCredentialIssued: false,
    independentRlsPenetrationStillRequired: true,
    productionReleaseAuthorised: false
  });
}

/**
 * PAY54 Batch 25 / 991 — fourth effective role verified separately.
 * No new pool is connected here; the operator supplies a restricted
 * existing staging pool and controls its IAM permissions independently.
 */
export async function probePay54StagingIdentityIssuerRole({
  sessionIssuerPool
} = {}) {
  if (!sessionIssuerPool ||
      typeof sessionIssuerPool.connect !== "function")
    deny();
  const role = await probe(sessionIssuerPool,
    "pay54_session_issue_role",null,PAY54_BOOTSTRAP_SQL.ROLE_SQL);
  return Object.freeze({
    schema: "pay54.staging-identity-issuer-posture.v1",
    verifiedRole: role.expectedRole,
    effectiveFunctionOnlyRoleVerified: true,
    accountSessionIssued: false,
    realDatabaseStagingApproved: false,
    productionReleaseAuthorised: false
  });
}
