
"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  integrateEvidenceSources, renderIntegrationSummary
} from "../governance/staging-evidence-source-integration.mjs";

const register = JSON.parse(readFileSync(new URL("../governance/staging-evidence-register.json", import.meta.url)));
const baseline = JSON.parse(readFileSync(new URL("../governance/staging-evidence-submissions.json", import.meta.url)));
const wrap = bindings => ({ schemaVersion: "1.0.0", phase: "2G-T", scope: "staging", bindings });
const SHA = data => createHash("sha256").update(data).digest("hex");

function fixture(t) {
  const cwd = mkdtempSync(join(tmpdir(), "p54-2gt-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8" }).trim();
  git("init", "-q", "-b", "project-titan");
  git("config", "user.name", "PAY54 CI");
  git("config", "user.email", "ci@example.invalid");
  mkdirSync(join(cwd, "artifacts"));
  const bytes = Buffer.from("PAY54 source integrity only\n");
  writeFileSync(join(cwd, "artifacts", "report.txt"), bytes);
  git("add", "."); git("commit", "-qm", "verified source");
  const commit = git("rev-parse", "HEAD");
  const entry = {
    id: "EV-STG-01-0001", controlId: "STG-01", sourceSystem: "GITHUB",
    recordId: "actions/runs/42048316372", sha256: SHA(bytes),
    recordedAt: "2026-11-05T20:00:00Z", submittedBy: "release-office",
    reviewStatus: "PENDING_INDEPENDENT_REVIEW"
  };
  return {
    cwd, git, entry, commit,
    intake: entries => ({ ...baseline, submissions: entries }),
    binding: { evidenceId: entry.id, commit, path: "artifacts/report.txt" },
    options: { cwd, trustedRef: "refs/heads/project-titan" }
  };
}

test("zero evidence is safe and release remains blocked", t => {
  const f = fixture(t);
  const result = integrateEvidenceSources(register, baseline, wrap([]), f.options);
  assert.equal(result.valid, true);
  assert.equal(result.sourceVerified, 0);
  assert.equal(result.release, "BLOCKED");
  assert.equal(result.independentlyApproved, 0);
});

test("valid explicit binding verifies bytes but not approval", t => {
  const f = fixture(t);
  const result = integrateEvidenceSources(register, f.intake([f.entry]), wrap([f.binding]), f.options);
  assert.equal(result.valid, true);
  assert.equal(result.sourceVerified, 1);
  assert.equal(result.records[0].status, "SOURCE_VERIFIED");
  assert.equal(result.controlApprovals, 0);
  assert.equal(result.deploymentAuthorized, false);
});

test("missing binding is reported outstanding, never verified", t => {
  const f = fixture(t);
  const result = integrateEvidenceSources(register, f.intake([f.entry]), wrap([]), f.options);
  assert.equal(result.outstanding, 1);
  assert.equal(result.sourceVerified, 0);
});

test("digest mismatch is rejected", t => {
  const f = fixture(t);
  const entry = { ...f.entry, sha256: "0".repeat(64) };
  const result = integrateEvidenceSources(register, f.intake([entry]), wrap([f.binding]), f.options);
  assert.equal(result.rejected, 1);
  assert.equal(result.sourceVerified, 0);
});

test("non-GitHub evidence cannot be verified by Git blob", t => {
  const f = fixture(t);
  const entry = { ...f.entry, sourceSystem: "GOOGLE_CLOUD" };
  const result = integrateEvidenceSources(register, f.intake([entry]), wrap([f.binding]), f.options);
  assert.equal(result.rejected, 1);
});

test("extra binding or unsafe path fails whole integration closed", t => {
  const f = fixture(t);
  for (const binding of [
    { ...f.binding, path: "../private" },
    { ...f.binding, unexpected: true },
    { ...f.binding, evidenceId: "UNKNOWN-ID" }
  ]) {
    const result = integrateEvidenceSources(register, f.intake([f.entry]), wrap([binding]), f.options);
    assert.equal(result.valid, false);
    assert.equal(result.sourceVerified, 0);
  }
});

test("duplicate bindings and invalid intake fail closed", t => {
  const f = fixture(t);
  const duplicate = integrateEvidenceSources(register, f.intake([f.entry]), wrap([f.binding, f.binding]), f.options);
  assert.equal(duplicate.valid, false);
  const bad = integrateEvidenceSources(register, f.intake([{ ...f.entry, reviewStatus: "APPROVED" }]), wrap([f.binding]), f.options);
  assert.equal(bad.valid, false);
});

test("commit off trusted branch is rejected", t => {
  const f = fixture(t);
  f.git("checkout", "-qb", "untrusted");
  writeFileSync(join(f.cwd, "artifacts", "report.txt"), "altered");
  f.git("add", "."); f.git("commit", "-qm", "untrusted");
  const rogue = { ...f.binding, commit: f.git("rev-parse", "HEAD") };
  const result = integrateEvidenceSources(register, f.intake([f.entry]), wrap([rogue]), f.options);
  assert.equal(result.rejected, 1);
});

test("report never equates source verification with release approval", t => {
  const f = fixture(t);
  const result = integrateEvidenceSources(register, f.intake([f.entry]), wrap([f.binding]), f.options);
  const output = renderIntegrationSummary(result);
  assert.match(output, /Staging release: \*\*BLOCKED\*\*/);
  assert.match(output, /Independently approved: \*\*0\*\*/);
  assert.doesNotMatch(output, /Staging release: \*\*APPROVED\*\*/);
});
