"use strict";

/**
 * PAY54 PR61: PayTag runtime activation security gate.
 * This is a planning-time FAIL-CLOSED policy, not a deployment authorizer.
 * No network, DB, secret, cloud, or filesystem access is performed.
 */

export const PAY54_PAYTAG_RUNTIME_POLICY_VERSION = "1.0.0";

const DENIED = "PAY54_PAYTAG_RUNTIME_ACTIVATION_DENIED";
const SOURCE_SHA = /^[a-f0-9]{40}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const CHANGE = /^PAY54-DB-[1-9][0-9]{3,10}$/;
const REPOSITORY = "demiladeolawoye/PAY54_v8.0_SmartWallet";
const BRANCH = "project-titan";
const EXPECTED_MIGRATION = "028_paytag_restricted_execution.sql";

const isRecord = value => value !== null &&
  typeof value === "object" && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype ||
   Object.getPrototypeOf(value) === null);

function requireExactKeys(value, keys) {
  if (!isRecord(value) ||
      Object.keys(value).length !== keys.length ||
      keys.some(key => !Object.hasOwn(value, key))) {
    throw new Error(DENIED);
  }
}

/**
 * Returns an immutable planning-only report. All activation decisions are
 * negative even with a complete evidence package. External reviewers must
 * independently attest the genuine GitHub, IAM and PostgreSQL state.
 */
export function assessPayTagRuntimeActivation(request) {
  requireExactKeys(request, [
    "repository", "branch", "sourceSha", "migrationFilename",
    "migrationSha256", "changeTicket", "environment",
    "independentReviewVerified", "exactHeadCiVerified",
    "backupRestoreWitnessed", "rollbackDrillWitnessed",
    "iamNoLoginProven", "roleMembershipAuditProven",
    "roleAclAuditProven", "defaultPrivilegesAuditProven",
    "rlsAuditProven", "credentialStorageApproved",
    "rotationDrillWitnessed", "databaseConnectionAttested",
    "requestedMigrationExecution", "requestedRuntimeActivation",
    "requestedFinancialActivation"
  ]);

  if (request.repository !== REPOSITORY ||
      request.branch !== BRANCH ||
      !SOURCE_SHA.test(request.sourceSha) ||
      request.migrationFilename !== EXPECTED_MIGRATION ||
      !DIGEST.test(request.migrationSha256) ||
      !CHANGE.test(request.changeTicket) ||
      request.environment !== "DISPOSABLE_REVIEW" ||
      request.requestedMigrationExecution !== false ||
      request.requestedRuntimeActivation !== false ||
      request.requestedFinancialActivation !== false) {
    throw new Error(DENIED);
  }

  for (const key of [
    "independentReviewVerified", "exactHeadCiVerified",
    "backupRestoreWitnessed", "rollbackDrillWitnessed",
    "iamNoLoginProven", "roleMembershipAuditProven",
    "roleAclAuditProven", "defaultPrivilegesAuditProven",
    "rlsAuditProven", "credentialStorageApproved",
    "rotationDrillWitnessed", "databaseConnectionAttested"
  ]) {
    if (typeof request[key] !== "boolean") throw new Error(DENIED);
  }

  const unmet = Object.freeze([
    ...[
      "independentReviewVerified", "exactHeadCiVerified",
      "backupRestoreWitnessed", "rollbackDrillWitnessed",
      "iamNoLoginProven", "roleMembershipAuditProven",
      "roleAclAuditProven", "defaultPrivilegesAuditProven",
      "rlsAuditProven", "credentialStorageApproved",
      "rotationDrillWitnessed", "databaseConnectionAttested"
    ].filter(key => request[key] !== true)
  ]);
  return Object.freeze({
    schema: "pay54.paytag-runtime-activation-preflight.v1",
    version: PAY54_PAYTAG_RUNTIME_POLICY_VERSION,
    sourceReviewOnly: true,
    evidenceClaimsNotIndependentlyValidated: true,
    unmetEvidenceClaims: unmet,
    migrationExecutionAuthorised: false,
    runtimeActivationAuthorised: false,
    financialActivationAuthorised: false,
    persistentStagingAuthorised: false,
    productionAuthorised: false
  });
}
