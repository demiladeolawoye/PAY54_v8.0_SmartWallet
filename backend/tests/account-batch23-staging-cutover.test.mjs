"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { reviewPay54StagingCutover as review }
  from "../governance/pay54-batch23-staging-cutover.mjs";

const sha = "a".repeat(40);
const valid = {
  expectedCommitSha: sha,
  trustedAttestationVerifier: {
    verifyForReview: ({ expectedCommitSha }) => ({
      expectedCommitSha, verifiedCategoryCount: 7,
      distinctReviewerCount: 3, evidenceSetCompleteForManualReview: true,
      productionDeploymentAuthorised: false
    })
  },
  signedAttestations: [],
  independentlyReviewedMigrationHashes: {},
  sessionReadPool: {}, accountReadPool: {}, sessionRotationPool: {},
  inspectDatabaseRoles: async () => ({
    restrictedRolesVerified: true, productionReleaseAuthorised: false
  }),
  verifyMigrationHashes: () => ({
    sourceHashesMatchReviewedValues: true, matchingMigrationCount: 18,
    productionReleaseAuthorised: false
  })
};

test("906: all three independent verification results yield review only", async () => {
  const result = await review(valid);
  assert.equal(result.preflightCompleteForIndependentReview, true);
  assert.equal(result.matchingSqlMigrations, 18);
  assert.equal(result.accountSwitchProductionEnabled, false);
  assert.equal(result.realMoneyAuthorised, false);
  assert.equal(result.productionDeploymentAuthorised, false);
  assert.ok(Object.isFrozen(result));
});

test("906: incomplete signatures, drift, DB privilege or verifier failure refuse review", async () => {
  for (const mutation of [
    { trustedAttestationVerifier: {
      verifyForReview: () => ({ ...valid.trustedAttestationVerifier.verifyForReview({
        expectedCommitSha: sha
      }), distinctReviewerCount: 1 })
    } },
    { verifyMigrationHashes: () => ({
      sourceHashesMatchReviewedValues: false, matchingMigrationCount: 18,
      productionReleaseAuthorised: false
    }) },
    { inspectDatabaseRoles: async () => ({
      restrictedRolesVerified: false, productionReleaseAuthorised: false
    }) },
    { inspectDatabaseRoles: async () => { throw Error("private-database-error"); } },
    { expectedCommitSha: "not-a-sha" }
  ]) await assert.rejects(review({ ...valid, ...mutation }),
    /STAGING_CUTOVER_REVIEW_DENIED/);
});

test("906: source summaries claiming production readiness are rejected", async () => {
  for (const bad of [
    { inspectDatabaseRoles: async () => ({
      restrictedRolesVerified: true, productionReleaseAuthorised: true
    }) },
    { verifyMigrationHashes: () => ({
      sourceHashesMatchReviewedValues: true, matchingMigrationCount: 18,
      productionReleaseAuthorised: true
    }) }
  ]) await assert.rejects(review({ ...valid, ...bad }),
    /STAGING_CUTOVER_REVIEW_DENIED/);
});
