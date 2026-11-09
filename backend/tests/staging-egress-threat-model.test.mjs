
"use strict";

/*
 * PAY54 Phase 2G-Z
 * STG-05 Egress Threat Model Regression Tests
 */

import test from "node:test";

import assert from "node:assert/strict";

import {
  readFileSync
} from "node:fs";

import {
  assessEgressThreatModel,
  renderEgressThreatModel
} from "../governance/staging-egress-threat-model.mjs";

const model = JSON.parse(
  readFileSync(
    new URL(
      "../governance/staging-egress-threat-model.json",
      import.meta.url
    ),
    "utf8"
  )
);

const terraform = `
variable "authorized_provisioning" {
  type = bool
  default = false
}

locals {
  enabled = var.authorized_provisioning
}

resource "google_cloud_run_v2_service" "news_staging" {
  count = local.enabled ? 1 : 0
  ingress = "INGRESS_TRAFFIC_INTERNAL_ONLY"
  invoker_iam_disabled = false
}

resource "google_iam_workload_identity_pool_provider" "github" {
  count = local.enabled ? 1 : 0
  disabled = true
}
`;

const check = (
  inputModel = model,
  inputTerraform = terraform
) =>
  assessEgressThreatModel(
    inputModel,
    inputTerraform
  );

const fail = (
  inputModel,
  inputTerraform
) =>
  assert.throws(
    () => check(inputModel, inputTerraform),
    /STG-05 fail-closed/
  );

const clone = () =>
  structuredClone(model);

test(
  "baseline produces design-only, blocked outcome",
  () => {
    const result = check();

    assert.equal(
      result.sourceAssumptions,
      "MATCHED_SOURCE"
    );

    assert.equal(
      result.stagingRelease,
      "BLOCKED"
    );

    assert.equal(
      result.cloudProvisioning,
      "DISABLED"
    );

    assert.equal(
      result.financialExecution,
      "DISABLED"
    );

    assert.equal(
      result.securityApproval,
      "NOT_VERIFIED"
    );

    assert.equal(
      result.outboundEnforcement,
      "NOT_VERIFIED"
    );

    assert.equal(
      result.authenticatedCloudEvidence,
      0
    );

    assert.equal(
      result.independentApprovals,
      0
    );

    assert.equal(
      result.approvedDestinations,
      0
    );
  }
);

test(
  "report documents six open threats and unresolved destinations",
  () => {
    const report = renderEgressThreatModel(
      check()
    );

    assert.match(
      report,
      /EG-06/
    );

    assert.match(
      report,
      /Outbound enforcement: \*\*NOT_VERIFIED\*\*/
    );

    assert.match(
      report,
      /Staging release: \*\*BLOCKED\*\*/
    );
  }
);

test(
  "source enabling provisioning is rejected",
  () => {
    fail(
      model,
      terraform.replace(
        "default = false",
        "default = true"
      )
    );
  }
);

test(
  "public ingress is rejected",
  () => {
    fail(
      model,
      terraform.replace(
        "INGRESS_TRAFFIC_INTERNAL_ONLY",
        "INGRESS_TRAFFIC_ALL"
      )
    );
  }
);

test(
  "disabling invoker IAM is rejected",
  () => {
    fail(
      model,
      terraform.replace(
        "invoker_iam_disabled = false",
        "invoker_iam_disabled = true"
      )
    );
  }
);

test(
  "activating federation is rejected",
  () => {
    fail(
      model,
      terraform.replace(
        "disabled = true",
        "disabled = false"
      )
    );
  }
);

test(
  "adding purported egress enforcement requires design review",
  () => {
    fail(
      model,
      terraform +
        '\nvpc_access { egress = "ALL_TRAFFIC" }'
    );
  }
);

test(
  "adding unverified destination is rejected",
  () => {
    const changed = clone();

    changed.externalDestinations.push(
      "example.com"
    );

    fail(changed);
  }
);

test(
  "marking threat mitigated without approval is rejected",
  () => {
    const changed = clone();

    changed.threats[0].status = "CLOSED";

    fail(changed);
  }
);

test(
  "removing threat is rejected",
  () => {
    const changed = clone();

    changed.threats.pop();

    fail(changed);
  }
);

test(
  "asserting approved architecture is rejected",
  () => {
    const changed = clone();

    changed.networkArchitecture = "APPROVED";

    fail(changed);
  }
);

test(
  "unexpected source path is rejected",
  () => {
    const changed = clone();

    changed.sourcePath =
      "terraform/production/main.tf";

    fail(changed);
  }
);
