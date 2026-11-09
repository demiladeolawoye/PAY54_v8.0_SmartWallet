"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assessNetworkSource, renderNetworkSummary } from "../governance/staging-network-audit.mjs";

function withRepo(files, callback) {
  const root = mkdtempSync(join(tmpdir(), "pay54-stg05-"));
  try {
    for (const [path, content] of Object.entries(files)) {
      const target = join(root, path);
      mkdirSync(join(target, ".."), { recursive: true });
      writeFileSync(target, content);
    }
    callback(root);
  } finally { rmSync(root, { recursive: true, force: true }); }
}
function blocked(report) {
  assert.equal(report.release, "BLOCKED");
  assert.equal(report.controlStatus, "NOT_VERIFIED");
  assert.equal(report.provisioningAuthorized, false);
  assert.equal(report.deploymentAuthorized, false);
  assert.equal(report.financialExecutionAuthorized, false);
  assert.equal(report.independentApprovals, 0);
  assert.equal(report.authenticatedCloudEvidence, 0);
  assert.ok(report.checks.every(c => c.status === "NOT_VERIFIED"));
}
test("absent Terraform cannot become a security PASS", () => withRepo({}, root => {
  const r = assessNetworkSource(root); blocked(r);
  assert.equal(r.sourceAudit, "NO_STAGING_TERRAFORM_INSPECTED");
  assert.equal(r.inspectedFiles, 0);
}));
test("resource declarations are inventory signals, not security certification", () => withRepo({
  "terraform/staging/network.tf": 'resource "google_compute_network" "main" {}\nresource "google_compute_firewall" "allow_all" {}\n'
}, root => {
  const r = assessNetworkSource(root); blocked(r);
  assert.equal(r.inspectedFiles, 1);
  assert.ok(r.checks.find(c => c.id === "INGRESS").resourceTypeSignals.includes("google_compute_firewall"));
  assert.match(renderNetworkSummary(r), /NOT a Terraform plan/i);
}));
test("Terraform outside approved staging paths is not assumed in scope", () => withRepo({
  "terraform/production/main.tf": 'resource "google_compute_network" "prod" {}'
}, root => {
  const r = assessNetworkSource(root); blocked(r);
  assert.equal(r.inspectedFiles, 0);
}));
test("HCL without recognized resource blocks is still unverified", () => withRepo({
  "infra/terraform/staging/main.tf": 'module "staging_network" { source = "../modules/network" }'
}, root => {
  const r = assessNetworkSource(root); blocked(r);
  assert.equal(r.inspectedFiles, 1);
  assert.equal(r.checks.find(c => c.id === "INGRESS").resourceTypeSignals.length, 0);
}));
test("report has explicit independent review requirements and release block", () => withRepo({}, root => {
  const s = renderNetworkSummary(assessNetworkSource(root));
  assert.match(s, /negative tests/);
  assert.match(s, /BLOCKED/);
  assert.match(s, /independently reviewed Terraform plan/);
}));
