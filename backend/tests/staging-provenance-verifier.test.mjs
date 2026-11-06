
"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  symlinkSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

import {
  verifyCandidates,
  TRUSTED_REPOSITORY
} from "../governance/staging-provenance-verifier.mjs";

function git(cwd, ...args) {
  return execFileSync(
    "git",
    ["-C", cwd, ...args],
    { encoding: "utf8" }
  ).trim();
}

function fixture(t) {
  const cwd = mkdtempSync(
    join(tmpdir(), "pay54-git-source-")
  );

  t.after(() => rmSync(cwd, {
    recursive: true,
    force: true
  }));

  git(cwd, "init", "-q", "-b", "project-titan");
  git(cwd, "config", "user.email", "ci@example.invalid");
  git(cwd, "config", "user.name", "PAY54 Test");

  mkdirSync(join(cwd, "evidence"));

  const bytes = Buffer.from(
    "PAY54 verified source fixture\n",
    "utf8"
  );

  writeFileSync(
    join(cwd, "evidence", "sample.txt"),
    bytes
  );

  git(cwd, "add", ".");
  git(cwd, "commit", "-qm", "trusted sample");

  const commit = git(cwd, "rev-parse", "HEAD");

  const candidate = {
    commit,
    path: "evidence/sample.txt",
    sha256: createHash("sha256")
      .update(bytes)
      .digest("hex")
  };

  const options = {
    cwd,
    trustedRef: "refs/heads/project-titan"
  };

  const manifest = candidates => ({
    repository: TRUSTED_REPOSITORY,
    candidates
  });

  return { cwd, candidate, manifest, options };
}

test("verifies exact bytes at trusted commit without approving release", t => {
  const f = fixture(t);
  const report = verifyCandidates(
    f.manifest([f.candidate]),
    f.options
  );

  assert.equal(report.sourceVerified, 1);
  assert.equal(report.rejected, 0);
  assert.equal(report.independentApprovals, 0);
  assert.equal(report.release, "BLOCKED");
  assert.equal(report.provisioning, "DISABLED");
  assert.equal(report.financialExecution, "DISABLED");
});

test("rejects changed SHA-256 digest", t => {
  const f = fixture(t);

  const bad = {
    ...f.candidate,
    sha256: "0".repeat(64)
  };

  assert.equal(
    verifyCandidates(f.manifest([bad]), f.options).rejected,
    1
  );
});

test("rejects commit not reachable from trusted branch", t => {
  const f = fixture(t);

  git(f.cwd, "checkout", "-qb", "untrusted");

  writeFileSync(
    join(f.cwd, "evidence", "sample.txt"),
    "malicious alternate source"
  );

  git(f.cwd, "add", ".");
  git(f.cwd, "commit", "-qm", "untrusted change");

  const rogue = {
    ...f.candidate,
    commit: git(f.cwd, "rev-parse", "HEAD")
  };

  assert.equal(
    verifyCandidates(f.manifest([rogue]), f.options).rejected,
    1
  );
});

test("rejects directory traversal and non-canonical paths", t => {
  const f = fixture(t);

  for (const path of [
    "../secret",
    "/etc/passwd",
    "a/../b",
    "a\\b",
    "a//b"
  ]) {
    assert.equal(
      verifyCandidates(
        f.manifest([{ ...f.candidate, path }]),
        f.options
      ).rejected,
      1
    );
  }
});

test("rejects symlinks and missing files", t => {
  const f = fixture(t);

  symlinkSync(
    "sample.txt",
    join(f.cwd, "evidence", "pointer")
  );

  git(f.cwd, "add", ".");
  git(f.cwd, "commit", "-qm", "add symlink");

  const linkCommit = git(f.cwd, "rev-parse", "HEAD");

  assert.equal(
    verifyCandidates(
      f.manifest([{
        ...f.candidate,
        commit: linkCommit,
        path: "evidence/pointer"
      }]),
      f.options
    ).rejected,
    1
  );

  assert.equal(
    verifyCandidates(
      f.manifest([{
        ...f.candidate,
        path: "evidence/absent"
      }]),
      f.options
    ).rejected,
    1
  );
});

test("rejects duplicate claims and incorrect repository", t => {
  const f = fixture(t);

  assert.equal(
    verifyCandidates(
      f.manifest([f.candidate, f.candidate]),
      f.options
    ).rejected,
    1
  );

  assert.throws(() =>
    verifyCandidates(
      { repository: "other/repo", candidates: [] },
      f.options
    )
  );
});

test("empty register is safe but never gains approval", t => {
  const f = fixture(t);
  const report = verifyCandidates(
    f.manifest([]),
    f.options
  );

  assert.equal(report.checked, 0);
  assert.equal(report.release, "BLOCKED");
});
