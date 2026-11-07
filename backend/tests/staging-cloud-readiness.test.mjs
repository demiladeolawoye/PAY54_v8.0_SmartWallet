
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — STG-04 CLOUD READINESS REGRESSION
   File: backend/tests/staging-cloud-readiness.test.mjs
   Version: 1.0.0
   ========================================================================== */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  auditStagingCloudReadiness,
  renderStagingCloudReadinessMarkdown
} from "../security/staging-cloud-readiness.mjs";

const secretPolicy = readFileSync(
  new URL(
    "../security/staging-secret-policy.mjs",
    import.meta.url
  ),
  "utf8"
);

const terraform = readFileSync(
  new URL(
    "../../infrastructure/staging/main.tf",
    import.meta.url
  ),
  "utf8"
);

const source = Object.freeze({
  policySource: secretPolicy,
  terraformSource: terraform
});

function result(id, inputs = source) {
  return auditStagingCloudReadiness(inputs)
    .controls.find(
      (item) => item.id === id
    ).result;
}

test(
  "baseline source declarations pass their offline checks",
  () => {
    for (const id of [
      "STG04-01",
      "STG04-02",
      "STG04-03"
    ]) {
      assert.equal(
        result(id),
        "PASS",
        id
      );
    }
  }
);

test(
  "cloud configuration is never inferred from offline source",
  () => {
    const audit = auditStagingCloudReadiness(source);

    assert.deepEqual(audit.totals, {
      PASS: 3,
      FAIL: 0,
      NOT_VERIFIED: 8
    });

    assert.equal(
      audit.stagingRelease,
      "BLOCKED"
    );

    assert.equal(
      audit.cloudProvisioning,
      "DISABLED"
    );

    assert.equal(
      audit.financialExecution,
      "DISABLED"
    );
  }
);

test(
  "enabling Secret Manager API in policy fails audit",
  () => {
    const changed = secretPolicy.replace(
      "secretManagerApiEnabled: false",
      "secretManagerApiEnabled: true"
    );

    assert.notEqual(changed, secretPolicy);

    assert.equal(
      result("STG04-01", {
        ...source,
        policySource: changed
      }),
      "FAIL"
    );
  }
);

test(
  "enabling cloud provisioning in policy fails audit",
  () => {
    const changed = secretPolicy.replace(
      "provisioningAuthorized: false",
      "provisioningAuthorized: true"
    );

    assert.notEqual(changed, secretPolicy);

    assert.equal(
      result("STG04-01", {
        ...source,
        policySource: changed
      }),
      "FAIL"
    );
  }
);

test(
  "changing Terraform provisioning default fails audit",
  () => {
    const changed = terraform.replace(
      /(variable\s+"authorized_provisioning"\s*\{[\s\S]*?default\s*=\s*)false/,
      "$1true"
    );

    assert.notEqual(changed, terraform);

    assert.equal(
      result("STG04-02", {
        ...source,
        terraformSource: changed
      }),
      "FAIL"
    );
  }
);

test(
  "enabling GitHub identity federation fails audit",
  () => {
    const changed = terraform.replace(
      /(resource\s+"google_iam_workload_identity_pool_provider"\s+"github"\s*\{[\s\S]*?disabled\s*=\s*)true/,
      "$1false"
    );

    assert.notEqual(changed, terraform);

    assert.equal(
      result("STG04-03", {
        ...source,
        terraformSource: changed
      }),
      "FAIL"
    );
  }
);

test(
  "making Cloud Run externally accessible fails audit",
  () => {
    const changed = terraform.replace(
      '"INGRESS_TRAFFIC_INTERNAL_ONLY"',
      '"INGRESS_TRAFFIC_ALL"'
    );

    assert.notEqual(changed, terraform);

    assert.equal(
      result("STG04-03", {
        ...source,
        terraformSource: changed
      }),
      "FAIL"
    );
  }
);

test(
  "release remains blocked even if static controls pass",
  () => {
    const audit = auditStagingCloudReadiness(source);

    assert.equal(
      audit.stagingRelease,
      "BLOCKED"
    );

    assert.equal(
      audit.controls.filter(
        (item) => item.result === "NOT_VERIFIED"
      ).length,
      8
    );
  }
);

test(
  "Markdown summary states the offline verification limits",
  () => {
    const report = renderStagingCloudReadinessMarkdown(
      auditStagingCloudReadiness(source)
    );

    assert.match(
      report,
      /NOT CLOUD ATTESTATION OR DEPLOYMENT APPROVAL/
    );

    assert.match(
      report,
      /Staging release: BLOCKED/
    );

    assert.match(
      report,
      /AccessSecretVersion/
    );
  }
);

test(
  "input types are checked and cannot silently pass",
  () => {
    assert.throws(
      () => auditStagingCloudReadiness({
        policySource: null,
        terraformSource: ""
      }),
      TypeError
    );

    assert.throws(
      () => auditStagingCloudReadiness({
        policySource: "",
        terraformSource: null
      }),
      TypeError
    );
  }
);
