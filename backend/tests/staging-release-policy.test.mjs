
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — STAGING RELEASE SECURITY TESTS
   File: backend/tests/staging-release-policy.test.mjs
   Version: 1.0.0
   ========================================================================== */

import test from "node:test";
import assert from "node:assert/strict";

import {
  STAGING_BASELINE
} from "../deployment/hosting-policy.mjs";

import {
  STAGING_RELEASE_BASELINE,
  validateStagingReleaseContract,
  assertStagingReleaseContract
} from "../deployment/staging-release-policy.mjs";

const SYNTHETIC_IMAGE =
  "europe-west2-docker.pkg.dev/pay54-staging/news/service@sha256:" +
  "a".repeat(64);

function validContract() {
  return {
    release: {
      ...STAGING_RELEASE_BASELINE.release
    },
    identity: {
      ...STAGING_RELEASE_BASELINE.identity
    },
    controls: {
      ...STAGING_RELEASE_BASELINE.controls
    },
    hostingManifest: {
      ...STAGING_BASELINE,
      image: SYNTHETIC_IMAGE
    }
  };
}

test("accepts the private staging release baseline", () => {
  const result = assertStagingReleaseContract(
    validContract()
  );

  assert.equal(result.valid, true);
  assert.deepEqual(result.violations, []);
});

test("refuses production and automatic deployment", () => {
  for (const changes of [
    { productionDeployment: true },
    { automaticDeployment: true },
    { deploymentMode: "automatic" },
    { branch: "main" },
    { githubEnvironment: "production" }
  ]) {
    const contract = validContract();
    Object.assign(contract.release, changes);

    assert.equal(
      validateStagingReleaseContract(contract).valid,
      false
    );
  }
});

test("refuses untrusted authentication mechanisms", () => {
  for (const changes of [
    { mechanism: "service-account-key" },
    { serviceAccountKeyAllowed: true },
    { repositoryRestricted: false },
    { branchRestricted: false },
    { environmentRestricted: false },
    { dedicatedDeployerIdentity: false },
    { dedicatedRuntimeIdentity: false }
  ]) {
    const contract = validContract();
    Object.assign(contract.identity, changes);

    assert.equal(
      validateStagingReleaseContract(contract).valid,
      false
    );
  }
});

test("refuses public and unauthenticated access", () => {
  for (const changes of [
    { authenticatedInvocation: false },
    { internalIngress: false },
    { publicAccessAllowed: true }
  ]) {
    const contract = validContract();
    Object.assign(contract.controls, changes);

    assert.throws(
      () => assertStagingReleaseContract(contract),
      /rejected/
    );
  }
});

test("refuses missing supply-chain protection", () => {
  for (const changes of [
    { immutableImageDigest: false },
    { imageVulnerabilityAssessmentRequired: false },
    { provenanceVerificationRequired: false }
  ]) {
    const contract = validContract();
    Object.assign(contract.controls, changes);

    assert.equal(
      validateStagingReleaseContract(contract).valid,
      false
    );
  }
});

test("requires approval, audit and rollback controls", () => {
  for (const changes of [
    { protectedEnvironmentReviewRequired: false },
    { rollbackProcedureRequired: false },
    { cloudAuditLoggingRequired: false }
  ]) {
    const contract = validContract();
    Object.assign(contract.controls, changes);

    assert.equal(
      validateStagingReleaseContract(contract).valid,
      false
    );
  }
});

test("rejects news activation, customer data and money movement", () => {
  for (const changes of [
    { newsProviderEnabled: true },
    { realCustomerDataAllowed: true },
    { financialExecutionEnabled: true }
  ]) {
    const contract = validContract();
    Object.assign(contract.controls, changes);

    assert.equal(
      validateStagingReleaseContract(contract).valid,
      false
    );
  }
});

test("inherits the existing hosting security policy", () => {
  for (const changes of [
    { ingress: "all" },
    { requireAuthentication: false },
    { region: "us-central1" },
    { image: "pay54/news:latest" }
  ]) {
    const contract = validContract();
    Object.assign(contract.hostingManifest, changes);

    assert.equal(
      validateStagingReleaseContract(contract).valid,
      false
    );
  }
});

test("rejects unexpected release properties", () => {
  const contract = validContract();

  contract.privateKey =
    "synthetic-value-not-a-real-secret";

  assert.equal(
    validateStagingReleaseContract(contract).valid,
    false
  );
});

test("rejects malformed top-level contracts", () => {
  for (const value of [
    null,
    undefined,
    [],
    "staging"
  ]) {
    assert.equal(
      validateStagingReleaseContract(value).valid,
      false
    );
  }
});

test("does not mutate release configuration", () => {
  const contract = validContract();
  const snapshot = structuredClone(contract);

  validateStagingReleaseContract(contract);

  assert.deepEqual(contract, snapshot);
});
