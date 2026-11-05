
"use strict";

/* PAY54 ENTERPRISE — Phase 2G-P evidence intake regression v1.0.0 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  validateEvidenceIntake,
  renderEvidenceIntakeSummary
} from "../governance/staging-evidence-intake.mjs";

const register = JSON.parse(readFileSync(
  new URL("../governance/staging-evidence-register.json", import.meta.url), "utf8"
));
const intake = JSON.parse(readFileSync(
  new URL("../governance/staging-evidence-submissions.json", import.meta.url), "utf8"
));
const clone = () => structuredClone(intake);

const sample = () => ({
  id: "EV-STG-01-0001",
  controlId: "STG-01",
  sourceSystem: "GITHUB",
  recordId: "actions/runs/42048316372",
  sha256: "a".repeat(64),
  recordedAt: "2026-11-05T20:00:00Z",
  submittedBy: "release-office",
  reviewStatus: "PENDING_INDEPENDENT_REVIEW"
});

test("empty intake is valid and remains non-deploying", () => {
  const result = validateEvidenceIntake(register, intake);
  assert.equal(result.valid, true, result.errors.join("; "));
  assert.equal(result.count, 0);
  assert.equal(result.independentlyVerified, 0);
  assert.equal(result.stagingApproved, false);
});

test("candidate metadata can be recorded but not approved", () => {
  const candidate = clone();
  candidate.submissions.push(sample());

  const result = validateEvidenceIntake(register, candidate);
  assert.equal(result.valid, true, result.errors.join("; "));
  assert.equal(result.independentlyVerified, 0);
});

test("all execution authorisation flags remain false", () => {
  for (const key of [
    "deploymentAuthorized",
    "provisioningAuthorized",
    "financialExecutionAuthorized"
  ]) {
    const candidate = clone();
    candidate[key] = true;
    assert.equal(validateEvidenceIntake(register, candidate).valid, false);
  }
});

test("candidate cannot assert verified or approved status", () => {
  for (const status of ["VERIFIED", "APPROVED", "PASS", "REJECTED"]) {
    const candidate = clone();
    candidate.submissions.push({ ...sample(), reviewStatus: status });
    assert.equal(validateEvidenceIntake(register, candidate).valid, false);
  }
});

test("invalid and duplicate evidence control identifiers fail", () => {
  const candidate = clone();
  candidate.submissions.push(
    sample(),
    { ...sample(), controlId: "STG-99" }
  );

  assert.equal(validateEvidenceIntake(register, candidate).valid, false);
});

test("unknown metadata and malformed digests fail closed", () => {
  const candidate = clone();
  candidate.submissions.push({
    ...sample(),
    sha256: "invalid",
    secret: "not-allowed"
  });

  assert.equal(validateEvidenceIntake(register, candidate).valid, false);
});

test("timestamps must be valid UTC dates", () => {
  for (const recordedAt of [
    "2026-13-05T20:00:00Z",
    "2026-11-05",
    "invalid"
  ]) {
    const candidate = clone();
    candidate.submissions.push({ ...sample(), recordedAt });
    assert.equal(validateEvidenceIntake(register, candidate).valid, false);
  }
});

test("summary never calls unreviewed evidence deployment approval", () => {
  const result = validateEvidenceIntake(register, intake);
  const summary = renderEvidenceIntakeSummary(result);

  assert.match(summary, /Staging release: \*\*BLOCKED\*\*/);
  assert.match(summary, /Independent verifications: \*\*0\*\*/);
  assert.doesNotMatch(summary, /Staging release: \*\*APPROVED\*\*/);
});
