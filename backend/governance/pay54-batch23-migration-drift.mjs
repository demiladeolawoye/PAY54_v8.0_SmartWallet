"use strict";

/**
 * PAY54 Batch 23 / 903 — additive migration hash drift detector.
 *
 * This compares exact SQL source bytes against independently reviewed SHA256
 * expectations. The caller MUST obtain that manifest from a trusted signed
 * release process. This verifier cannot establish manifest authenticity,
 * approve migrations, or connect to any database.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, timingSafeEqual } from "node:crypto";
import { PAY54_CANONICAL_MIGRATION_ORDER }
  from "./pay54-batch22-migration-inventory.mjs";

export const PAY54_BATCH23_MIGRATION_ORDER = Object.freeze([
  ...PAY54_CANONICAL_MIGRATION_ORDER,
  "018_account_session_rotation.sql"
]);

export const PAY54_BATCH25_FULL_MIGRATION_ORDER = Object.freeze([
  ...PAY54_BATCH23_MIGRATION_ORDER,
  "019_identity_assertion_bootstrap.sql",
  "020_initial_account_binding.sql"
]);

const root = resolve(dirname(fileURLToPath(import.meta.url)),
  "../db/migrations");
const SHA256 = /^[0-9a-f]{64}$/;
const deny = () => { throw new Error("PAY54_MIGRATION_DRIFT_DENIED"); };

export function verifyPay54MigrationDrift({
  independentlyReviewedSha256,
  getSource = filename => readFileSync(resolve(root, filename)),
  requiredMigrations = PAY54_BATCH23_MIGRATION_ORDER
} = {}) {
  const isLegacy = requiredMigrations === PAY54_BATCH23_MIGRATION_ORDER;
  const isExtended = requiredMigrations === PAY54_BATCH25_FULL_MIGRATION_ORDER;
  if (!isLegacy && !isExtended) deny();
  if (!independentlyReviewedSha256 ||
      typeof independentlyReviewedSha256 !== "object" ||
      Array.isArray(independentlyReviewedSha256) ||
      typeof getSource !== "function" ||
      Object.keys(independentlyReviewedSha256).length !==
        requiredMigrations.length) deny();

  for (const filename of requiredMigrations) {
    const expected = independentlyReviewedSha256[filename];
    if (!Object.hasOwn(independentlyReviewedSha256, filename) ||
        typeof expected !== "string" || !SHA256.test(expected)) deny();
    let actual;
    try {
      const data = getSource(filename);
      if (!Buffer.isBuffer(data) && typeof data !== "string") deny();
      actual = createHash("sha256").update(data).digest();
    } catch { deny(); }
    if (!timingSafeEqual(actual, Buffer.from(expected, "hex"))) deny();
  }
  return Object.freeze({
    schema: isExtended
      ? "pay54.migration-drift-review.v2"
      : "pay54.migration-drift-review.v1",
    matchingMigrationCount: requiredMigrations.length,
    sourceHashesMatchReviewedValues: true,
    reviewedManifestSignatureNotVerifiedHere: true,
    databaseMigrationExecuted: false,
    stagingReleaseAuthorised: false,
    productionReleaseAuthorised: false
  });
}
