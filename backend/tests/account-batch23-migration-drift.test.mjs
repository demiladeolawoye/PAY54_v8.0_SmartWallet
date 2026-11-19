"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  verifyPay54MigrationDrift as verify,
  PAY54_BATCH23_MIGRATION_ORDER as order
} from "../governance/pay54-batch23-migration-drift.mjs";

const filename = file =>
  new URL("../db/migrations/" + file, import.meta.url);
const digestMap = Object.fromEntries(order.map(file =>
  [file, createHash("sha256").update(readFileSync(filename(file)))
    .digest("hex")]));

test("904: all canonical and additive SQL bytes must match reviewed fingerprints", () => {
  const value = verify({ independentlyReviewedSha256: digestMap });
  assert.equal(value.matchingMigrationCount, 18);
  assert.equal(value.sourceHashesMatchReviewedValues, true);
  assert.equal(value.reviewedManifestSignatureNotVerifiedHere, true);
  assert.equal(value.productionReleaseAuthorised, false);
  assert.ok(Object.isFrozen(value));
});

test("904: tampered SQL and stale or extra hashes deny before a migration", () => {
  const altered = { ...digestMap, "018_account_session_rotation.sql": "0".repeat(64) };
  assert.throws(() => verify({ independentlyReviewedSha256: altered }),
    /MIGRATION_DRIFT_DENIED/);
  const missing = { ...digestMap };
  delete missing["017_account_directory_read_role.sql"];
  assert.throws(() => verify({ independentlyReviewedSha256: missing }),
    /MIGRATION_DRIFT_DENIED/);
  assert.throws(() => verify({
    independentlyReviewedSha256: { ...digestMap, unexpected: "0".repeat(64) }
  }), /MIGRATION_DRIFT_DENIED/);
  assert.throws(() => verify({
    independentlyReviewedSha256: digestMap,
    getSource: file => file === "018_account_session_rotation.sql"
      ? "-- forged SQL" : readFileSync(filename(file))
  }), /MIGRATION_DRIFT_DENIED/);
});
