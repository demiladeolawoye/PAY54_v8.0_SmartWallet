
"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  reconcileStagingEvidence,
  renderReconciliationSummary
} from "../governance/staging-evidence-reconciliation.mjs";

const read = name => JSON.parse(readFileSync(new URL(name, import.meta.url), "utf8"));
const register = read("../governance/staging-evidence-register.json");
const intake = read("../governance/staging-evidence-submissions.json");
const observations = read("../governance/staging-observations.json");
const clone = structuredClone;

function blocked(result) {
  assert.equal(result.release, "BLOCKED");
  assert.equal(result.deploymentAuthorized, false);
  assert.equal(result.provisioningAuthorized, false);
  assert.equal(result.financialExecutionAuthorized, false);
  assert.equal(result.authenticatedEvidence, 0);
  assert.equal(result.independentApprovals, 0);
}

test("baseline observations remain unauthenticated and release blocked", () => {
  const report = reconcileStagingEvidence(register, intake, observations);
  assert.equal(report.integrityPassed, true, report.errors.join("; "));
  assert.equal(report.screenshotObservations, 7);
  assert.equal(report.controls.length, 7);
  blocked(report);
});

test("observations cannot silently change baseline control status", () => {
  const report = reconcileStagingEvidence(register, intake, observations);
  assert.equal(report.controls.find(x => x.id === "STG-02").baselineStatus, "NOT_CONFIGURED");
  blocked(report);
});

test("unapproved authentication claim fails integrity", () => {
  const modified = clone(observations);
  modified.authentication = "AUTHENTICATED";
  const result = reconcileStagingEvidence(register, intake, modified);
  assert.equal(result.integrityPassed, false);
  blocked(result);
});

test("cannot set deployment, provisioning or financial authorisation", () => {
  for (const field of ["deploymentAuthorized", "provisioningAuthorized", "financialExecutionAuthorized"]) {
    const modified = clone(observations);
    modified[field] = true;
    const result = reconcileStagingEvidence(register, intake, modified);
    assert.equal(result.integrityPassed, false, field);
    blocked(result);
  }
});

test("duplicate observation identifiers rejected", () => {
  const modified = clone(observations);
  modified.observations.push(clone(modified.observations[0]));
  const result = reconcileStagingEvidence(register, intake, modified);
  assert.equal(result.integrityPassed, false);
  blocked(result);
});

test("control ID mismatches rejected", () => {
  const modified = clone(observations);
  modified.observations[0].controlId = "STG-02";
  const result = reconcileStagingEvidence(register, intake, modified);
  assert.equal(result.integrityPassed, false);
  blocked(result);
});

test("unknown fields cannot introduce approval flags", () => {
  const modified = clone(observations);
  modified.observations[0].independentlyApproved = true;
  const result = reconcileStagingEvidence(register, intake, modified);
  assert.equal(result.integrityPassed, false);
  blocked(result);
});

test("invalid baseline audit fails closed", () => {
  const modified = clone(register);
  modified.controls[0].status = "VERIFIED";
  const result = reconcileStagingEvidence(modified, intake, observations);
  assert.equal(result.integrityPassed, false);
  blocked(result);
});

test("invalid candidate intake fails closed", () => {
  const modified = clone(intake);
  modified.deploymentAuthorized = true;
  const result = reconcileStagingEvidence(register, modified, observations);
  assert.equal(result.integrityPassed, false);
  blocked(result);
});

test("malformed observation descriptions rejected", () => {
  const modified = clone(observations);
  modified.observations[0].finding = "<secret>";
  const result = reconcileStagingEvidence(register, intake, modified);
  assert.equal(result.integrityPassed, false);
  blocked(result);
});

test("summary reports no independently authenticated evidence", () => {
  const summary = renderReconciliationSummary(reconcileStagingEvidence(register, intake, observations));
  assert.ok(summary.includes("Input integrity: **PASS**"));
  assert.ok(summary.includes("Staging release: **BLOCKED**"));
  assert.ok(summary.includes("Independently authenticated approvals: **0**"));
});
