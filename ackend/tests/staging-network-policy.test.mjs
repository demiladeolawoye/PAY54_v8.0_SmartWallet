
"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import { assessStagingNetworkPolicy, renderStagingNetworkPolicy } from "../governance/staging-network-policy.mjs";

const ids = [
  ["terraform_data", "provisioning_authorisation"],
  ["google_project_service", "required"],
  ["google_service_account", "deployer"],
  ["google_service_account", "runtime"],
  ["google_artifact_registry_repository", "images"],
  ["google_iam_workload_identity_pool", "github"],
  ["google_iam_workload_identity_pool_provider", "github"],
  ["google_service_account_iam_member", "github_impersonation"],
  ["google_artifact_registry_repository_iam_member", "deployer_image_reader"],
  ["google_cloud_run_v2_service", "news_staging"],
  ["google_cloud_run_v2_service_iam_member", "deployer_service"],
  ["google_service_account_iam_member", "deployer_runtime_user"]
];

function fixture() {
  const parts = [
    'variable "authorized_provisioning" { type = bool\n default = false }',
    'provider "google" { project = var.project_id\n region = "europe-west2" }',
    `locals {
      enabled = var.authorized_provisioning
      region = "europe-west2"
      github_branch = "refs/heads/project-titan"
      identity_condition = join(" && ", [
        "assertion.repository_id == '1'", "assertion.repository_owner_id == '1'",
        "assertion.repository == 'owner/repo'", "assertion.repository_owner == 'owner'",
        "assertion.ref == 'refs/heads/project-titan'",
        "assertion.environment == 'pay54-staging'",
        "assertion.event_name == 'workflow_dispatch'",
        "assertion.workflow_ref == 'owner/repo/.github/workflows/workflow.yml'"
      ])
    }`
  ];
  for (const [type, name] of ids) {
    const gate = type === "google_project_service"
      ? 'for_each = local.enabled ? local.required_apis : toset([])'
      : 'count = local.enabled ? 1 : 0';
    let extra = "";
    if (type === "terraform_data") extra = `lifecycle { precondition { condition = var.project_id != null && var.project_number != null && var.github_repository_id != null && var.github_owner_id != null && var.container_image != null && can(regex("^europe-west2-docker@sha256:[a-f0-9]{64}$", var.container_image)) } }`;
    if (type === "google_service_account" && name === "runtime") extra = 'account_id = "pay54-staging-runtime"';
    if (type === "google_iam_workload_identity_pool_provider") extra = 'disabled = true';
    if (type === "google_cloud_run_v2_service") extra = `ingress = "INGRESS_TRAFFIC_INTERNAL_ONLY"
      invoker_iam_disabled = false
      deletion_protection = true
      template { service_account = google_service_account.runtime[0].email }`;
    parts.push(`resource "${type}" "${name}" { ${gate}\n ${extra}\n }`);
  }
  return parts.join("\n");
}
function noRelease(report) {
  assert.equal(report.stagingRelease, "BLOCKED");
  assert.equal(report.cloudProvisioning, "DISABLED");
  assert.equal(report.financialExecution, "DISABLED");
  assert.equal(report.authenticatedEvidence, 0);
  assert.equal(report.independentApprovals, 0);
  assert.equal(report.securityApproval, "NOT_VERIFIED");
}

test("secure source baseline passes static policy but never approves release", () => {
  const result = assessStagingNetworkPolicy(fixture());
  assert.equal(result.sourceIntegrity, "PASS", JSON.stringify(result.findings));
  noRelease(result);
  assert.equal(result.findings.find(f => f.id === "CONTROLLED_EGRESS").status, "NOT_VERIFIED");
});

test("accidental provisioning default true is rejected", () => {
  const result = assessStagingNetworkPolicy(fixture().replace("default = false", "default = true"));
  assert.equal(result.sourceIntegrity, "FAIL");
  noRelease(result);
});

test("public Cloud Run ingress is rejected", () => {
  const result = assessStagingNetworkPolicy(fixture().replace("INGRESS_TRAFFIC_INTERNAL_ONLY", "INGRESS_TRAFFIC_ALL"));
  assert.equal(result.sourceIntegrity, "FAIL");
  noRelease(result);
});

test("disabling invoker IAM is rejected", () => {
  const result = assessStagingNetworkPolicy(fixture().replace("invoker_iam_disabled = false", "invoker_iam_disabled = true"));
  assert.equal(result.sourceIntegrity, "FAIL");
  noRelease(result);
});

test("activating OIDC federation is rejected", () => {
  const result = assessStagingNetworkPolicy(fixture().replace("disabled = true", "disabled = false"));
  assert.equal(result.sourceIntegrity, "FAIL");
  noRelease(result);
});

test("new ungated Terraform resources are rejected", () => {
  const result = assessStagingNetworkPolicy(fixture() + '\nresource "google_compute_firewall" "allow_any" {}\n');
  assert.equal(result.sourceIntegrity, "FAIL");
  noRelease(result);
});

test("missing gate is rejected", () => {
  const result = assessStagingNetworkPolicy(fixture().replace('resource "google_service_account" "runtime" { count = local.enabled ? 1 : 0', 'resource "google_service_account" "runtime" {'));
  assert.equal(result.sourceIntegrity, "FAIL");
  noRelease(result);
});

test("removing pinned-image input checks is rejected", () => {
  const result = assessStagingNetworkPolicy(fixture().replace("var.container_image != null", "true"));
  assert.equal(result.sourceIntegrity, "FAIL");
  noRelease(result);
});

test("untrusted allUsers binding is rejected", () => {
  const result = assessStagingNetworkPolicy(fixture() + '\n# look for allUsers in docs\nresource "google_cloud_run_v2_service_iam_member" "deployer_service_extra" { member = "allUsers" }');
  assert.equal(result.sourceIntegrity, "FAIL");
  noRelease(result);
});

test("commented-out public ingress does not override checked value", () => {
  const result = assessStagingNetworkPolicy(fixture() + '\n# ingress = "INGRESS_TRAFFIC_ALL"\n');
  assert.equal(result.sourceIntegrity, "PASS", JSON.stringify(result.findings));
  noRelease(result);
});

test("source-only report documents unresolved egress and security boundary", () => {
  const summary = renderStagingNetworkPolicy(assessStagingNetworkPolicy(fixture()));
  assert.match(summary, /Outbound access is not demonstrated as restricted/);
  assert.match(summary, /Staging release: \*\*BLOCKED\*\*/);
  assert.match(summary, /not cloud attestation or release approval/i);
});

test("empty source is rejected", () => assert.throws(() => assessStagingNetworkPolicy("")));
