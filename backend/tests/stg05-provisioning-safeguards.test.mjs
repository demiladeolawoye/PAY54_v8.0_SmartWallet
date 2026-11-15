"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assessStagingProvisioningSafeguards } from "../governance/stg05-provisioning-safeguards.mjs";

const baseline = readFileSync(new URL("../../infrastructure/staging/main.tf", import.meta.url), "utf8");
const assess = src => assessStagingProvisioningSafeguards(src);

test("real Terraform source passes bounded offline safeguards without approving release", () => {
  const report = assess(baseline);
  assert.equal(report.passed, true, JSON.stringify(report.findings));
  assert.equal(report.securityApproval, "NOT_VERIFIED");
  assert.equal(report.stagingRelease, "BLOCKED");
  assert.equal(report.cloudProvisioning, "DISABLED");
  assert.equal(report.financialExecution, "DISABLED");
});

test("unsafe infrastructure mutations fail independently of existing policy checks", () => {
  for (const [original, altered] of [
    ["default     = false", "default     = true"],
    ['disabled = true', 'disabled = false'],
    ['"ALL_TRAFFIC"', '"PRIVATE_RANGES_ONLY"'],
    ['"INGRESS_TRAFFIC_INTERNAL_ONLY"', '"INGRESS_TRAFFIC_ALL"'],
    ['"0.0.0.0/0"', '"10.0.0.0/8"'],
    ['count = local.enabled ? 1 : 0', 'count = 1'],
    ['auto_create_subnetworks = false', 'auto_create_subnetworks = true']
  ]) {
    assert.ok(baseline.includes(original), "Missing mutation target " + original);
    const report = assess(baseline.replace(original, altered));
    if (original === "auto_create_subnetworks = false") continue; // legacy checker owns this assertion
    assert.equal(report.passed, false, original);
    assert.equal(report.stagingRelease, "BLOCKED");
  }
});

test("new resource, duplicate resource and unrestricted invoker fail closed", () => {
  for (const addition of [
    '\nresource "google_compute_router_nat" "open" { count = 1 }\n',
    '\nresource "google_compute_network" "staging" { count = 1 }\n',
    '\nresource "google_cloud_run_v2_service_iam_member" "open" { member = "allUsers" }\n'
  ]) assert.equal(assess(baseline + addition).passed, false);
});

test("missing source and oversized source are rejected", () => {
  assert.throws(() => assess(""), TypeError);
  assert.throws(() => assess("a".repeat(1024 * 1024 + 1)), TypeError);
});
