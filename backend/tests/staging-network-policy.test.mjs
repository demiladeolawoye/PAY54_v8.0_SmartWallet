
"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

/* ==========================================================================
   STG-05 implementation-readiness regression cases
   Verify the authoritative Terraform source without cloud access.
   These tests do not certify networking enforcement or authorise provisioning.
   ========================================================================== */

const stagingTerraform = readFileSync(
  new URL("../../infrastructure/staging/main.tf", import.meta.url),
  "utf8"
);

test("repository staging Terraform satisfies existing source-security baseline", () => {
  const report = assessStagingNetworkPolicy(stagingTerraform);
  assert.equal(report.sourceIntegrity, "PASS", JSON.stringify(report.findings));
  noRelease(report);
});

test("network controls remain explicitly unverified until independent attestation", () => {
  const report = assessStagingNetworkPolicy(stagingTerraform);
  const egress = report.findings.find(f => f.id === "CONTROLLED_EGRESS");
  assert.ok(egress, "Missing controlled egress finding");
  assert.equal(egress.status, "NOT_VERIFIED");
  assert.equal(report.sourceOnly, true);
  noRelease(report);
});

test("Cloud Run ALL_TRAFFIC declaration alone never certifies outbound enforcement", () => {
  const sample = fixture().replace(
    "template { service_account = google_service_account.runtime[0].email }",
    'template { service_account = google_service_account.runtime[0].email vpc_access { egress = "ALL_TRAFFIC" } }'
  );
  const report = assessStagingNetworkPolicy(sample);
  assert.equal(report.sourceIntegrity, "PASS", JSON.stringify(report.findings));
  assert.equal(report.findings.find(f => f.id === "CONTROLLED_EGRESS").status, "NOT_VERIFIED");
  noRelease(report);
});

test("an ungated VPC cannot be silently introduced into the staging configuration", () => {
  const sample = stagingTerraform +
    '\nresource "google_compute_network" "staging" { auto_create_subnetworks = false }\n';
  const report = assessStagingNetworkPolicy(sample);
  assert.equal(report.sourceIntegrity, "FAIL");
  assert.equal(report.findings.find(f => f.id === "RESOURCE_INVENTORY").status, "FAIL_SOURCE");
  noRelease(report);
});

test("a newly added but gated firewall still requires reviewed resource contracts", () => {
  const sample = stagingTerraform +
    '\nresource "google_compute_firewall" "egress_deny" { count = local.enabled ? 1 : 0 direction = "EGRESS" }\n';
  const report = assessStagingNetworkPolicy(sample);
  assert.equal(report.sourceIntegrity, "FAIL");
  assert.equal(report.findings.find(f => f.id === "RESOURCE_INVENTORY").status, "FAIL_SOURCE");
  noRelease(report);
});

test("duplicate infrastructure resource declarations fail closed", () => {
  const sample = stagingTerraform +
    '\nresource "google_service_account" "runtime" { count = local.enabled ? 1 : 0 }\n';
  const report = assessStagingNetworkPolicy(sample);
  assert.equal(report.sourceIntegrity, "FAIL");
  assert.equal(report.findings.find(f => f.id === "RESOURCE_INVENTORY").status, "FAIL_SOURCE");
  noRelease(report);
});

test("network implementation work cannot enable provisioning or federation", () => {
  for (const mutation of [
    stagingTerraform.replace("default     = false", "default     = true"),
    stagingTerraform.replace("disabled = true", "disabled = false")
  ]) {
    assert.notEqual(mutation, stagingTerraform, "Mutation fixture failed to change source");
    const report = assessStagingNetworkPolicy(mutation);
    assert.equal(report.sourceIntegrity, "FAIL");
    noRelease(report);
  }
});

test("source report explicitly retains the network-release block", () => {
  const summary = renderStagingNetworkPolicy(assessStagingNetworkPolicy(stagingTerraform));
  assert.match(summary, /STG-05 security approval: \*\*NOT_VERIFIED\*\*/);
  assert.match(summary, /Staging release: \*\*BLOCKED\*\*/);
  assert.match(summary, /Cloud provisioning: \*\*DISABLED\*\*/);
  assert.match(summary, /Financial execution: \*\*DISABLED\*\*/);
});

/* STG-05 fail-closed network resource contract mutation tests (offline only). */
function proposedNetworkFixture() {
  const original = "template { service_account = google_service_account.runtime[0].email }";
  const connected = 'template { service_account = google_service_account.runtime[0].email vpc_access { egress = "ALL_TRAFFIC" network_interfaces { network = google_compute_network.staging[0].id subnetwork = google_compute_subnetwork.staging[0].id tags = ["pay54-staging-egress"] } } }';
  const originalFixture = fixture();
  assert.ok(originalFixture.includes(original));
  return originalFixture.replace(original, connected) + [
    'variable "staging_subnet_cidr" { type = string default = null nullable = true }',
    'resource "google_compute_network" "staging" { count = local.enabled ? 1 : 0 project = var.project_id auto_create_subnetworks = false }',
    'resource "google_compute_subnetwork" "staging" { count = local.enabled ? 1 : 0 region = local.region network = google_compute_network.staging[0].id ip_cidr_range = var.staging_subnet_cidr }',
    'resource "google_compute_firewall" "egress_deny" { count = local.enabled ? 1 : 0 direction = "EGRESS" network = google_compute_network.staging[0].name target_tags = ["pay54-staging-egress"] destination_ranges = ["0.0.0.0/0"] deny { protocol = "all" } }'
  ].join("\n");
}

test("complete proposed network topology passes source inspection but never attests release", () => {
  const report = assessStagingNetworkPolicy(proposedNetworkFixture());
  assert.equal(report.sourceIntegrity, "PASS", JSON.stringify(report.findings));
  assert.equal(report.findings.find(f => f.id === "NETWORK_FOUNDATION").status, "PASS_SOURCE");
  assert.equal(report.findings.find(f => f.id === "CONTROLLED_EGRESS").status, "NOT_VERIFIED");
  noRelease(report);
});

test("partial network resources are rejected", () => {
  const full = proposedNetworkFixture();
  for (const type of ["google_compute_network", "google_compute_subnetwork", "google_compute_firewall"]) {
    const partial = full.split("\n").filter(line => !line.includes('resource "' + type + '"')).join("\n");
    const report = assessStagingNetworkPolicy(partial);
    assert.equal(report.sourceIntegrity, "FAIL", type);
    noRelease(report);
  }
});

test("insecure networking mutations fail source policy", () => {
  const full = proposedNetworkFixture();
  const mutations = [
    ["auto_create_subnetworks = false", "auto_create_subnetworks = true"],
    ["region = local.region network =", 'region = "us-central1" network ='],
    ["ip_cidr_range = var.staging_subnet_cidr", 'ip_cidr_range = "10.0.0.0/24"'],
    ["default = null nullable = true", "default = null nullable = false"],
    ['egress = "ALL_TRAFFIC"', 'egress = "PRIVATE_RANGES_ONLY"'],
    ['direction = "EGRESS"', 'direction = "INGRESS"'],
    ['destination_ranges = ["0.0.0.0/0"]', 'destination_ranges = ["10.0.0.0/8"]'],
    ['deny { protocol = "all" }', 'allow { protocol = "all" }'],
    ['tags = ["pay54-staging-egress"]', 'tags = ["uncontrolled"]']
  ];
  for (const [good, bad] of mutations) {
    assert.ok(full.includes(good), good);
    const report = assessStagingNetworkPolicy(full.replace(good, bad));
    assert.equal(report.sourceIntegrity, "FAIL", good);
    assert.equal(report.findings.find(f => f.id === "NETWORK_FOUNDATION").status, "FAIL_SOURCE", good);
    noRelease(report);
  }
});

test("new VPC without the original provisioning gate is rejected", () => {
  const full = proposedNetworkFixture();
  const unsafe = full.replace(
    'resource "google_compute_network" "staging" { count = local.enabled ? 1 : 0',
    'resource "google_compute_network" "staging" { count = 1'
  );
  assert.notEqual(full, unsafe);
  const report = assessStagingNetworkPolicy(unsafe);
  assert.equal(report.sourceIntegrity, "FAIL");
  assert.equal(report.findings.find(f => f.id === "GATED_RESOURCES").status, "FAIL_SOURCE");
  noRelease(report);
});
