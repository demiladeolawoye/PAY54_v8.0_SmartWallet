"use strict";

/**
 * PAY54 Batch 23 / 882 — fail-closed source inventory for migration 018.
 * Checks the migration's security shape. Actual PostgreSQL tests still own
 * functional evidence; this static inventory never authorises a deployment.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { assertPay54CanonicalMigrationInventory }
  from "./pay54-batch22-migration-inventory.mjs";

const filename = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../db/migrations/018_account_session_rotation.sql"
);
const deny = () => { throw new Error("PAY54_SESSION_MIGRATION_INVENTORY_DENIED"); };

export function verifyPay54RotationMigrationSource({
  readMigration = () => readFileSync(filename, "utf8"),
  verifyCanonical = assertPay54CanonicalMigrationInventory
} = {}) {
  if (typeof readMigration !== "function" ||
      typeof verifyCanonical !== "function") deny();
  let source;
  try {
    if (verifyCanonical()?.canonicalMigrationCount !== 17) deny();
    source = readMigration();
  } catch { deny(); }
  if (typeof source !== "string" || source.length < 500 ||
      !/CREATE ROLE pay54_session_rotate_role\s+NOLOGIN NOINHERIT NOSUPERUSER/i.test(source) ||
      !/NOBYPASSRLS/i.test(source) ||
      !/CREATE FUNCTION pay54\.rotate_account_context_session/i.test(source) ||
      !/LANGUAGE plpgsql SECURITY INVOKER/i.test(source) ||
      !/FOR UPDATE\s*;/i.test(source) ||
      !/session_status='REVOKED'/i.test(source) ||
      !/INSERT INTO pay54\.account_context_audit/i.test(source) ||
      !/REVOKE ALL ON FUNCTION pay54\.rotate_account_context_session/i.test(source) ||
      !/TO pay54_session_rotate_role/i.test(source) ||
      !/OWNER TO pay54_session_rotate_executor_role/i.test(source) ||
      !/CREATE ROLE pay54_session_rotate_executor_role NOLOGIN NOINHERIT NOSUPERUSER/i.test(source) ||
      !/GRANT EXECUTE ON FUNCTION pay54\\.rotate_account_context_session/i.test(source) ||
      /\bGRANT\s+(?:ALL|INSERT|UPDATE|DELETE)\s+ON\s+pay54\.(?:ledger_entries|financial_operations|wallets)/i.test(source)
  ) deny();

  return Object.freeze({
    schema: "pay54.rotation-migration-source-check.v1",
    baselineMigrationCount: 17,
    additiveMigration: "018_account_session_rotation.sql",
    restrictedSecurityDefinerOwnerRequired: true,
    publicAndCallerDirectDmlForbidden: true,
    productionMigrationAuthorised: false,
    realAccountSwitchEnabled: false
  });
}
