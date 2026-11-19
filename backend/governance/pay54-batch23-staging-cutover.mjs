"use strict";

/**
 * PAY54 Batch 23 / 905 — independent staging evidence composition.
 *
 * Each dependency is a real verifier, not a boolean claim. The Ed25519
 * verifier, restricted database pool probe and migration SHA256 verifier
 * must all complete without error. It does not authorise rollout, grant
 * database roles, issue a session or enable financial functionality.
 */
import { probePay54StagingDatabaseRoles }
  from "../src/postgres-staging-role-probe.mjs";
import { verifyPay54MigrationDrift }
  from "./pay54-batch23-migration-drift.mjs";

const SHA = /^[0-9a-f]{40}$/;
const deny = () => { throw new Error("PAY54_STAGING_CUTOVER_REVIEW_DENIED"); };

export async function reviewPay54StagingCutover({
  expectedCommitSha,
  trustedAttestationVerifier,
  signedAttestations,
  independentlyReviewedMigrationHashes,
  sessionReadPool,
  accountReadPool,
  sessionRotationPool,
  inspectDatabaseRoles = probePay54StagingDatabaseRoles,
  verifyMigrationHashes = verifyPay54MigrationDrift
} = {}) {
  if (!SHA.test(expectedCommitSha ?? "") ||
      typeof trustedAttestationVerifier?.verifyForReview !== "function" ||
      typeof inspectDatabaseRoles !== "function" ||
      typeof verifyMigrationHashes !== "function") deny();

  try {
    const signed = trustedAttestationVerifier.verifyForReview({
      expectedCommitSha,
      attestations: signedAttestations
    });
    if (signed.expectedCommitSha !== expectedCommitSha ||
        signed.evidenceSetCompleteForManualReview !== true ||
        signed.productionDeploymentAuthorised !== false ||
        signed.verifiedCategoryCount !== 7 ||
        signed.distinctReviewerCount < 3) deny();

    const drift = verifyMigrationHashes({
      independentlyReviewedSha256: independentlyReviewedMigrationHashes
    });
    if (drift.sourceHashesMatchReviewedValues !== true ||
        drift.matchingMigrationCount !== 18 ||
        drift.productionReleaseAuthorised !== false) deny();

    const roles = await inspectDatabaseRoles({
      sessionReadPool, accountReadPool, sessionRotationPool
    });
    if (roles.restrictedRolesVerified !== true ||
        roles.productionReleaseAuthorised !== false) deny();

    return Object.freeze({
      schema: "pay54.staging-cutover-review.v1",
      commitSha: expectedCommitSha,
      signedEvidenceCategories: signed.verifiedCategoryCount,
      matchingSqlMigrations: drift.matchingMigrationCount,
      effectiveDatabaseRolesVerified: true,
      preflightCompleteForIndependentReview: true,
      realDatabaseMigrationApproved: false,
      realMoneyAuthorised: false,
      accountSwitchProductionEnabled: false,
      productionDeploymentAuthorised: false
    });
  } catch { deny(); }
}
