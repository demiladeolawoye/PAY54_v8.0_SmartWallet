"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {
  assessPay54AccountSwitchCutoverClaims as assess,
  PAY54_SWITCH_CUTOVER_CONTROLS as controls
} from "../governance/pay54-batch21-account-switch-cutover.mjs";

test("811: missing real infrastructure claims keep switch release blocked", () => {
  const result = assess({
    "trusted-identity-and-session-store": true,
    "authoritative-account-memberships": true
  });
  assert.equal(result.claimedControlsComplete, false);
  assert.ok(result.controlsMissing.includes("enforced-postgresql-rls-and-tenant-tests"));
  assert.equal(result.authorisesDeployment, false);
  assert.equal(result.accountSwitchEnabled, false);
});
test("811: even all self-reported controls cannot automatically authorise production", () => {
  const result = assess(Object.fromEntries(controls.map(k => [k, true])));
  assert.equal(result.claimedControlsComplete, true);
  assert.equal(result.controlsMissing.length, 0);
  assert.equal(result.requiresIndependentEvidenceVerification, true);
  assert.equal(result.requiresFounderSecurityReleaseApproval, true);
  assert.equal(result.productionReady, false);
  assert.equal(result.authorisesMoneyMovement, false);
});
test("811: unexpected source claims are rejected rather than silently trusted", () => {
  assert.throws(() => assess({
    "enforced-postgresql-rls-and-tenant-tests": true,
    "browser-says-ready": true
  }), /CUTOVER_EVIDENCE_INVALID/);
  assert.throws(() => assess(null), /CUTOVER_EVIDENCE_INVALID/);
  assert.ok(Object.isFrozen(controls));
});
