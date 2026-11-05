
"use strict";

/* PAY54 ENTERPRISE — Phase 2G-O: fail-closed evidence register regression */

import test from "node:test";
import assert from "node:assert/strict";

import {
  readRegister,
  auditRegister,
  renderSummary,
  CONTROL_IDS
} from "../governance/staging-evidence-audit.mjs";

const original = readRegister();
const clone = () => structuredClone(original);

test("register defines seven uniquely identified controls", () => {
  const audit = auditRegister(original);

  assert.equal(audit.valid, true, audit.errors.join("; "));

  assert.deepEqual(
    original.controls.map(control => control.id),
    [...CONTROL_IDS]
  );

  assert.equal(audit.summary.verified, 0);
  assert.equal(audit.summary.stagingApproved, false);
});

test("staging and finance execution always remain unauthorised", () => {
  for (const field of [
    "deploymentAuthorized",
    "provisioningAuthorized",
    "financialExecutionAuthorized"
  ]) {
    const tampered = clone();
    tampered[field] = true;

    assert.equal(auditRegister(tampered).valid, false, field);
  }
});

test("verified or unknown statuses cannot be self-attested", () => {
  for (const status of [
    "VERIFIED", "PASS", "APPROVED", "READY", "UNKNOWN"
  ]) {
    const tampered = clone();
    tampered.controls[0].status = status;

    assert.equal(auditRegister(tampered).valid, false, status);
  }
});

test("control removal and duplication are rejected", () => {
  const missing = clone();
  missing.controls.pop();

  assert.equal(auditRegister(missing).valid, false);

  const duplicate = clone();
  duplicate.controls[1].id = duplicate.controls[0].id;

  assert.equal(auditRegister(duplicate).valid, false);
});

test("unreviewed evidence cannot be inserted", () => {
  const tampered = clone();

  tampered.controls[0].evidence.push({
    url: "https://example.com/claim"
  });

  assert.equal(auditRegister(tampered).valid, false);
});

test("every control requires accountable and independent verifier roles", () => {
  const tampered = clone();
  tampered.controls[3].verifierRole = "";

  assert.equal(auditRegister(tampered).valid, false);
});

test("read-only summary never reports release approval", () => {
  const summary = renderSummary(
    original,
    auditRegister(original)
  );

  assert.match(summary, /Staging release: BLOCKED/);
  assert.match(summary, /Verified: 0 \/ 7/);

  assert.doesNotMatch(
    summary,
    /Staging release: APPROVED/
  );
});
