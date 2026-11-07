
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — STG-03 SECRET POLICY REGRESSION
   File: backend/tests/staging-secret-policy.test.mjs
   Version: 1.0.0

   Offline tests only. No cloud SDK, credentials or external calls.
   ========================================================================== */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  STAGING_SECRET_POLICY as policy,
  validateSecretId,
  validateSecretVersion,
  validateSecretReference,
  validateStagingSecretPolicy
} from "../security/staging-secret-policy.mjs";

const terraformSource = readFileSync(
  new URL(
    "../../infrastructure/staging/main.tf",
    import.meta.url
  ),
  "utf8"
);

const policySource = readFileSync(
  new URL(
    "../security/staging-secret-policy.mjs",
    import.meta.url
  ),
  "utf8"
);

test("STG-03 policy validates and is immutable", () => {
  assert.equal(validateStagingSecretPolicy(), true);
  assert.equal(Object.isFrozen(policy), true);
  assert.equal(Object.isFrozen(policy.storage), true);
  assert.equal(Object.isFrozen(policy.access), true);
  assert.equal(Object.isFrozen(policy.operations), true);
  assert.equal(Object.isFrozen(policy.secretDefinitions), true);
  assert.ok(
    policy.secretDefinitions.every(Object.isFrozen)
  );
});

test(
  "cloud activation, provisioning and financial execution remain disabled",
  () => {
    for (const setting of [
      "secretManagerApiEnabled",
      "provisioningAuthorized",
      "createSecrets",
      "issueCredentials",
      "financialExecutionEnabled",
      "identityProviderActivated"
    ]) {
      assert.equal(policy[setting], false, setting);
    }

    assert.equal(policy.mode, "POLICY_ONLY");
  }
);

test(
  "staging is isolated to the approved project and London region",
  () => {
    assert.equal(policy.projectId, "pay54-staging-uk-01");
    assert.equal(policy.region, "europe-west2");
    assert.equal(policy.environment, "pay54-staging");
    assert.equal(
      policy.storage.preferredSecretType,
      "REGIONAL"
    );
  }
);

test(
  "runtime has only per-secret read entitlement in the proposed policy",
  () => {
    assert.equal(
      policy.access.runtimeRole,
      "roles/secretmanager.secretAccessor"
    );

    assert.equal(
      policy.access.runtimeGrantScope,
      "INDIVIDUAL_SECRET"
    );

    assert.equal(
      policy.access.prohibitProjectWideAccessor,
      true
    );

    assert.equal(
      policy.access.prohibitPublicPrincipals,
      true
    );

    assert.equal(
      policy.access.deployerCanReadPayload,
      false
    );

    assert.equal(
      policy.access.githubActionsCanReadPayload,
      false
    );

    assert.notEqual(
      policy.runtimeServiceAccountId,
      policy.deployerServiceAccountId
    );
  }
);

test("secret names must follow staging namespace", () => {
  for (
    const id of policy.secretDefinitions.map(
      (item) => item.id
    )
  ) {
    assert.equal(validateSecretId(id), true);
  }

  for (const id of [
    "prod-pay54-key",
    "pay54-stg-",
    "PAY54-stg-key",
    "pay54-stg-x/../../x",
    "pay54-stg-foo_1",
    ""
  ]) {
    assert.equal(validateSecretId(id), false, id);
  }
});

test(
  "only named regional secrets with pinned numeric versions are accepted",
  () => {
    assert.equal(validateSecretVersion("1"), true);
    assert.equal(validateSecretVersion("250"), true);

    for (const version of [
      "latest",
      "0",
      "01",
      "-1",
      "",
      "1/../2",
      1
    ]) {
      assert.equal(
        validateSecretVersion(version),
        false
      );
    }

    const valid =
      "projects/pay54-staging-uk-01/" +
      "locations/europe-west2/" +
      "secrets/pay54-stg-news-provider-api-key/" +
      "versions/2";

    assert.equal(
      validateSecretReference(valid),
      true
    );

    for (const invalid of [
      valid.replace(
        "/versions/2",
        "/versions/latest"
      ),
      valid.replace(
        "europe-west2",
        "us-central1"
      ),
      valid.replace(
        "pay54-staging-uk-01",
        "another-project"
      ),
      valid.replace(
        "pay54-stg-news-provider-api-key",
        "pay54-stg-unknown"
      ),
      "projects/pay54-staging-uk-01/" +
        "secrets/pay54-stg-news-provider-api-key/" +
        "versions/2"
    ]) {
      assert.equal(
        validateSecretReference(invalid),
        false,
        invalid
      );
    }
  }
);

test(
  "secret access auditing is mandatory but not falsely reported as configured",
  () => {
    assert.equal(
      policy.operations.accessAuditLogsRequired,
      true
    );

    assert.equal(
      policy.operations.auditLogService,
      "secretmanager.googleapis.com"
    );

    assert.equal(
      policy.operations.auditAccessMethod,
      "AccessSecretVersion"
    );

    assert.equal(
      policy.operations.auditLogsConfigured,
      false
    );
  }
);

test(
  "secret review and rotation require independent controls",
  () => {
    assert.ok(
      policy.operations.rotationReviewDays <= 90
    );

    assert.equal(
      policy.operations.rotateByVersionReplacement,
      true
    );

    assert.equal(
      policy.operations.verifyRollbackBeforeRotation,
      true
    );

    assert.equal(
      policy.operations.incidentRevocationRequired,
      true
    );

    assert.equal(
      policy.operations.automaticRotationEnabled,
      false
    );

    assert.equal(
      policy.operations.independentSecurityReviewRequired,
      true
    );
  }
);

test(
  "policy rejects weakened permission or enablement variants",
  () => {
    assert.equal(
      validateStagingSecretPolicy({
        ...policy,
        provisioningAuthorized: true
      }),
      false
    );

    assert.equal(
      validateStagingSecretPolicy({
        ...policy,
        secretManagerApiEnabled: true
      }),
      false
    );

    assert.equal(
      validateStagingSecretPolicy({
        ...policy,
        access: {
          ...policy.access,
          runtimeGrantScope: "PROJECT"
        }
      }),
      false
    );

    assert.equal(
      validateStagingSecretPolicy({
        ...policy,
        operations: {
          ...policy.operations,
          accessAuditLogsRequired: false
        }
      }),
      false
    );

    assert.equal(
      validateStagingSecretPolicy({
        ...policy,
        storage: {
          ...policy.storage,
          prohibitLatestAlias: false
        }
      }),
      false
    );

    assert.equal(
      validateStagingSecretPolicy({
        ...policy,
        secretDefinitions: [
          ...policy.secretDefinitions,
          policy.secretDefinitions[0]
        ]
      }),
      false
    );
  }
);

test(
  "existing Terraform staging baseline stays non-provisioning",
  () => {
    assert.match(
      terraformSource,
      /variable\s+"authorized_provisioning"\s*\{[\s\S]*?default\s*=\s*false/
    );

    assert.match(
      terraformSource,
      /enabled\s*=\s*var\.authorized_provisioning/
    );

    assert.match(
      terraformSource,
      /disabled\s*=\s*true/
    );

    assert.match(
      terraformSource,
      /INGRESS_TRAFFIC_INTERNAL_ONLY/
    );

    assert.doesNotMatch(
      terraformSource,
      /resource\s+"google_secret_manager_(secret|secret_version|secret_iam_member)"/
    );
  }
);

test(
  "policy implementation contains no cloud command or credential material",
  () => {
    assert.doesNotMatch(
      policySource,
      /(?:^|\s)(?:import\s+.*(?:google-cloud|googleapis)|gcloud\s+|terraform\s+apply|terraform\s+destroy)/m
    );

    assert.doesNotMatch(
      policySource,
      /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/
    );

    assert.doesNotMatch(
      policySource,
      /"type"\s*:\s*"service_account"/
    );
  }
);
