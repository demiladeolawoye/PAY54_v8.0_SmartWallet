
"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  validateProvenanceCandidates,
  renderProvenanceSummary
} from "../governance/staging-provenance-policy.mjs";

const baseline = JSON.parse(
  readFileSync(
    new URL(
      "../governance/staging-provenance-candidates.json",
      import.meta.url
    ),
    "utf8"
  )
);

const candidate = {
  id: "EV-001",
  controlId: "STG-01",
  commitSha: "a".repeat(40),
  filePath: "evidence/report.json",
  sha256: "b".repeat(64),
  submittedBy: "github:review-submitter",
  submittedAt: "2026-11-06T10:00:00.000Z",
  status: "UNVERIFIED"
};

const check = record =>
  validateProvenanceCandidates(record);

const withCandidates = (...records) => ({
  ...baseline,
  candidates: records
});

test("empty register is valid but not approved", () => {
  const result = check(baseline);

  assert.equal(result.valid, true);
  assert.equal(result.authenticatedCount, 0);
  assert.equal(result.stagingApproved, false);
  assert.equal(result.deploymentAuthorized, false);
});

test("well-formed candidate remains unverified", () => {
  const result = check(withCandidates(candidate));

  assert.equal(result.valid, true);
  assert.equal(result.candidateCount, 1);
  assert.equal(result.authenticatedCount, 0);
});

test("wrong repository is rejected", () => {
  assert.equal(
    check({ ...baseline, repository: "other/repo" }).valid,
    false
  );
});

test("wrong branch is rejected", () => {
  assert.equal(
    check({ ...baseline, branch: "main" }).valid,
    false
  );
});

test("deployment authorisation is prohibited", () => {
  assert.equal(
    check({ ...baseline, deploymentAuthorized: true }).valid,
    false
  );
});

test("provisioning authorisation is prohibited", () => {
  assert.equal(
    check({ ...baseline, provisioningAuthorized: true }).valid,
    false
  );
});

test("financial execution authorisation is prohibited", () => {
  assert.equal(
    check({ ...baseline, financialExecutionAuthorized: true }).valid,
    false
  );
});

test("fabricated approval status is rejected", () => {
  assert.equal(
    check(withCandidates({
      ...candidate,
      status: "APPROVED"
    })).valid,
    false
  );
});

test("fabricated verification status is rejected", () => {
  assert.equal(
    check(withCandidates({
      ...candidate,
      status: "VERIFIED"
    })).valid,
    false
  );
});

test("duplicate evidence identifiers are rejected", () => {
  assert.equal(
    check(withCandidates(candidate, candidate)).valid,
    false
  );
});

test("path traversal is rejected", () => {
  assert.equal(
    check(withCandidates({
      ...candidate,
      filePath: "../../secrets.json"
    })).valid,
    false
  );
});

test("absolute paths are rejected", () => {
  assert.equal(
    check(withCandidates({
      ...candidate,
      filePath: "/etc/passwd"
    })).valid,
    false
  );
});

test("invalid commit hashes are rejected", () => {
  assert.equal(
    check(withCandidates({
      ...candidate,
      commitSha: "123"
    })).valid,
    false
  );
});

test("invalid file digests are rejected", () => {
  assert.equal(
    check(withCandidates({
      ...candidate,
      sha256: "0".repeat(63)
    })).valid,
    false
  );
});

test("impossible calendar dates are rejected", () => {
  assert.equal(
    check(withCandidates({
      ...candidate,
      submittedAt: "2026-02-31T10:00:00.000Z"
    })).valid,
    false
  );
});

test("unexpected approval fields are rejected", () => {
  assert.equal(
    check(withCandidates({
      ...candidate,
      independentlyApproved: true
    })).valid,
    false
  );
});

test("report cannot claim release approval", () => {
  const summary = renderProvenanceSummary(
    check(withCandidates(candidate))
  );

  assert.match(
    summary,
    /Staging release: BLOCKED/
  );

  assert.match(
    summary,
    /Authenticated source records: 0/
  );
});
