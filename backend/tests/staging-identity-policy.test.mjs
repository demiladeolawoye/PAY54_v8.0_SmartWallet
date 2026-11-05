
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — STAGING IDENTITY TESTS
   File: backend/tests/staging-identity-policy.test.mjs
   Version: 1.0.0

   Uses synthetic GitHub numeric IDs.
   No credentials, real tokens or cloud requests.
   ========================================================================== */

import test from "node:test";
import assert from "node:assert/strict";

import {
  TRUSTED_GITHUB,
  STAGING_INFRASTRUCTURE,
  IAM_BOUNDARY,
  createStagingIdentityPolicy,
  validateGitHubIdentityClaims,
  assertStagingIdentityClaims,
  validateInfrastructureContract
} from "../deployment/staging-identity-policy.mjs";

const TEST_REPOSITORY_ID = "123456789";
const TEST_OWNER_ID = "987654321";

function policy() {
  return createStagingIdentityPolicy({
    repositoryId: TEST_REPOSITORY_ID,
    ownerId: TEST_OWNER_ID
  });
}

function claims(overrides = {}) {
  return {
    iss: TRUSTED_GITHUB.issuer,
    ...policy().requirements,
    ...overrides
  };
}

test(
  "creates an immutable staging trust configuration",
  () => {
    const result = policy();

    assert.equal(result.deploymentEnabled, false);
    assert.equal(Object.isFrozen(result), true);

    assert.equal(
      result.requirements.repository_id,
      TEST_REPOSITORY_ID
    );

    assert.equal(
      result.requirements.repository_owner_id,
      TEST_OWNER_ID
    );
  }
);

test(
  "requires real numeric identity parameters",
  () => {
    for (const value of [
      undefined,
      null,
      "",
      "0",
      "-1",
      "unknown",
      "123abc",
      "01"
    ]) {
      assert.throws(
        () => createStagingIdentityPolicy({
          repositoryId: value,
          ownerId: TEST_OWNER_ID
        })
      );
    }

    assert.throws(
      () => createStagingIdentityPolicy({
        repositoryId: TEST_REPOSITORY_ID
      })
    );
  }
);

test(
  "accepts the exact trusted synthetic claims",
  () => {
    const result = assertStagingIdentityClaims(
      claims(),
      policy()
    );

    assert.equal(result.valid, true);
    assert.deepEqual(result.violations, []);
  }
);

test(
  "rejects a different repository or account",
  () => {
    for (const change of [
      { repository_id: "123456788" },
      { repository_owner_id: "987654320" },
      { repository: "other-owner/other-repository" },
      { repository_owner: "other-owner" }
    ]) {
      assert.equal(
        validateGitHubIdentityClaims(
          claims(change),
          policy()
        ).valid,
        false
      );
    }
  }
);

test(
  "rejects branch, environment and event changes",
  () => {
    for (const change of [
      { ref: "refs/heads/main" },
      { ref: "refs/heads/feature" },
      { environment: "production" },
      { environment: "" },
      { event_name: "pull_request" },
      { event_name: "push" }
    ]) {
      assert.equal(
        validateGitHubIdentityClaims(
          claims(change),
          policy()
        ).valid,
        false
      );
    }
  }
);

test(
  "rejects unapproved workflows and OIDC issuers",
  () => {
    for (const change of [
      {
        workflow_ref:
          "demiladeolawoye/PAY54_v8.0_SmartWallet/" +
          ".github/workflows/unapproved.yml@" +
          "refs/heads/project-titan"
      },
      { iss: "https://untrusted.example" }
    ]) {
      assert.throws(
        () => assertStagingIdentityClaims(
          claims(change),
          policy()
        ),
        /identity rejected/
      );
    }
  }
);

test(
  "requires all critical claims",
  () => {
    for (const name of [
      "repository_id",
      "repository_owner_id",
      "repository",
      "repository_owner",
      "ref",
      "environment",
      "event_name",
      "workflow_ref"
    ]) {
      const input = claims();
      delete input[name];

      assert.equal(
        validateGitHubIdentityClaims(
          input,
          policy()
        ).valid,
        false
      );
    }
  }
);

test(
  "trust condition includes every identity restriction",
  () => {
    const result = policy();

    for (
      const [name, value] of
      Object.entries(result.requirements)
    ) {
      assert.ok(
        result.condition.includes(
          `assertion.${name} == ${JSON.stringify(value)}`
        )
      );
    }

    assert.equal(
      result.condition.split(" && ").length,
      Object.keys(result.requirements).length
    );
  }
);

test(
  "identity mapping uses GitHub repository IDs",
  () => {
    const mapping = policy().attributeMapping;

    assert.equal(
      mapping["attribute.repository_id"],
      "assertion.repository_id"
    );

    assert.equal(
      mapping["attribute.repository_owner_id"],
      "assertion.repository_owner_id"
    );

    assert.equal(
      mapping["google.subject"],
      "assertion.sub"
    );
  }
);

test(
  "accepts the approved private staging specification",
  () => {
    const result =
      validateInfrastructureContract({
        ...STAGING_INFRASTRUCTURE
      });

    assert.equal(result.valid, true);
  }
);

test(
  "rejects public ingress and disabled authentication",
  () => {
    for (const changes of [
      { ingress: "all" },
      { authenticationRequired: false },
      { publicInvokerAllowed: true },
      { deploymentApprovalRequired: false }
    ]) {
      assert.equal(
        validateInfrastructureContract({
          ...STAGING_INFRASTRUCTURE,
          ...changes
        }).valid,
        false
      );
    }
  }
);

test(
  "rejects weakened deployment security",
  () => {
    for (const changes of [
      { imageDigestRequired: false },
      { imageScanningRequired: false },
      { imageProvenanceRequired: false },
      { rollbackRequired: false },
      { auditLoggingRequired: false }
    ]) {
      assert.equal(
        validateInfrastructureContract({
          ...STAGING_INFRASTRUCTURE,
          ...changes
        }).valid,
        false
      );
    }
  }
);

test(
  "rejects activation of restricted capabilities",
  () => {
    for (const changes of [
      { providerEnabled: true },
      { financialExecutionEnabled: true },
      { customerDataEnabled: true }
    ]) {
      assert.equal(
        validateInfrastructureContract({
          ...STAGING_INFRASTRUCTURE,
          ...changes
        }).valid,
        false
      );
    }
  }
);

test(
  "rejects unexpected infrastructure settings",
  () => {
    assert.equal(
      validateInfrastructureContract({
        ...STAGING_INFRASTRUCTURE,
        publicEndpoint: true
      }).valid,
      false
    );
  }
);

test(
  "requires separation of deployer and runtime identities",
  () => {
    assert.equal(
      IAM_BOUNDARY.deployerAndRuntimeSeparated,
      true
    );

    assert.equal(
      IAM_BOUNDARY.serviceAccountKeysAllowed,
      false
    );

    assert.equal(
      IAM_BOUNDARY.deployerProjectOwnerAllowed,
      false
    );

    assert.equal(
      IAM_BOUNDARY.runtimeCloudRunAdminAllowed,
      false
    );

    assert.deepEqual(
      IAM_BOUNDARY.deploymentRoles.map(
        entry => entry.role
      ),
      [
        "roles/run.developer",
        "roles/artifactregistry.reader",
        "roles/iam.serviceAccountUser"
      ]
    );
  }
);

test(
  "rejects malformed claims and infrastructure",
  () => {
    for (const value of [
      null,
      undefined,
      [],
      "unsafe"
    ]) {
      assert.equal(
        validateGitHubIdentityClaims(
          value,
          policy()
        ).valid,
        false
      );

      assert.equal(
        validateInfrastructureContract(value).valid,
        false
      );
    }
  }
);

test(
  "does not mutate supplied claims",
  () => {
    const input = claims();
    const snapshot = structuredClone(input);

    validateGitHubIdentityClaims(input, policy());

    assert.deepEqual(input, snapshot);
  }
);
