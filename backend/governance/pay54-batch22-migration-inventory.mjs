"use strict";

/**
 * PAY54 Batch 22 / 860 — canonical migration compatibility guard.
 *
 * Prevents recurrence of the initial Batch 22 draft conflict in which a
 * second account/member schema was introduced before canonical migration 008.
 * Read-only static source verifier; does not run migrations or grant access.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

export const PAY54_CANONICAL_MIGRATION_ORDER = Object.freeze([
  "001_financial_ledger.sql",
  "002_ledger_integrity_hardening.sql",
  "003_wallet_reservation.sql",
  "004_reservation_lifecycle.sql",
  "005_operation_state_integrity.sql",
  "006_database_role_isolation.sql",
  "007_direct_ledger_access_boundary.sql",
  "008_account_context_foundation.sql",
  "009_personal_wallet_binding.sql",
  "010_wallet_binding_lifecycle_guard.sql",
  "011_wallet_eligibility_view.sql",
  "012_account_read_role_baseline.sql",
  "013_account_rls_denial.sql",
  "014_auth_sessions.sql",
  "015_account_context_audit.sql",
  "016_session_account_integrity.sql",
  "017_account_directory_read_role.sql"
]);

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../db/migrations");
const deny = reason => { throw new Error("PAY54_MIGRATION_INVENTORY_DENIED_" + reason); };

export function assertPay54CanonicalMigrationInventory({
  getSource = file => readFileSync(resolve(root, file), "utf8")
} = {}) {
  if (typeof getSource !== "function") deny("READER");

  const sources = [];
  for (const filename of PAY54_CANONICAL_MIGRATION_ORDER) {
    let source;
    try { source = getSource(filename); } catch { deny("MISSING"); }
    if (typeof source !== "string" || !source.trim()) deny("EMPTY");
    sources.push({ filename, source });
  }
  for (const { filename, source } of sources.slice(13)) {
    if (/\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?pay54\.(?:account_contexts|account_memberships)\b/i.test(source)) {
      deny("DUPLICATED_CANONICAL_SCHEMA");
    }
    if (/\bGRANT\s+\w[\s\S]*?\bTO\s+pay54_account_reader_role\b/i.test(source)) {
      deny("LEGACY_DENY_ROLE_REGRANTED");
    }
  }
  if (!/CREATE\s+TABLE\s+pay54\.account_contexts/i.test(sources[7].source) ||
      !/CREATE\s+TABLE\s+pay54\.account_memberships/i.test(sources[7].source) ||
      !/RESTRICTIVE\s+FOR\s+SELECT/i.test(sources[12].source)) {
    deny("CANONICAL_ACCOUNT_OR_DENIAL_CHANGED");
  }
  return Object.freeze({
    schema: "pay54.migration-inventory-verification.v1",
    canonicalMigrationCount: sources.length,
    legacyDenyRolePreserved: true,
    liveDatabaseVerified: false,
    authorisedToMigrate: false
  });
}
