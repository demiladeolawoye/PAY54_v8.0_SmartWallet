
"use strict";

/* PAY54 Phase 2G-S — read-only Git source and SHA-256 verification.
   Verification of repository bytes is NOT authentication, review or release approval.
   No remote calls, credentials, checkout, mutation, provisioning or deployment. */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export const TRUSTED_REPOSITORY = "demiladeolawoye/PAY54_v8.0_SmartWallet";
export const TRUSTED_BRANCH = "project-titan";
export const MAX_CANDIDATES = 100;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;

function git(cwd, args, { encoding = "utf8", maxBuffer = MAX_FILE_BYTES + 65536 } = {}) {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding,
    timeout: 15000,
    maxBuffer,
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function validPath(value) {
  return typeof value === "string" &&
    value.length > 0 && value.length <= 512 &&
    !value.startsWith("/") && !value.startsWith("-") &&
    !value.includes("\\") && !value.includes("\0") &&
    !/[\r\n]/.test(value) &&
    value.split("/").every(part => part !== "" && part !== "." && part !== "..");
}

function parseCandidate(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("Candidate must be an object.");
  }

  const keys = Object.keys(record).sort();
  if (keys.join(",") !== "commit,path,sha256") {
    throw new Error("Candidate fields must be exactly commit, path and sha256.");
  }

  if (typeof record.commit !== "string" ||
      !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(record.commit)) {
    throw new Error("Candidate commit must be a full lowercase Git object ID.");
  }

  if (!validPath(record.path)) {
    throw new Error("Candidate path is invalid or unsafe.");
  }

  if (typeof record.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(record.sha256)) {
    throw new Error("Candidate SHA-256 must be 64 lowercase hexadecimal characters.");
  }

  return record;
}

export function verifyCandidates(
  manifest,
  { cwd, trustedRef = "refs/remotes/origin/project-titan" } = {}
) {
  if (!manifest || typeof manifest !== "object" ||
      Array.isArray(manifest) ||
      Object.keys(manifest).sort().join(",") !== "candidates,repository") {
    throw new Error("Manifest must contain exactly repository and candidates.");
  }

  if (manifest.repository !== TRUSTED_REPOSITORY) {
    throw new Error("Manifest repository does not match PAY54.");
  }

  if (!Array.isArray(manifest.candidates) ||
      manifest.candidates.length > MAX_CANDIDATES) {
    throw new Error("Candidate count is invalid.");
  }

  if (!cwd || typeof cwd !== "string") {
    throw new Error("A local repository working directory is required.");
  }

  if (typeof trustedRef !== "string" ||
      !/^refs\/(?:heads|remotes\/origin)\/project-titan$/.test(trustedRef)) {
    throw new Error("Trusted reference must be the approved project-titan branch.");
  }

  const root = git(cwd, ["rev-parse", "--show-toplevel"]).trim();
  const refCommit = git(
    root,
    ["rev-parse", "--verify", `${trustedRef}^{commit}`]
  ).trim();

  const unique = new Set();
  const results = [];

  for (const raw of manifest.candidates) {
    let candidate;

    try {
      candidate = parseCandidate(raw);

      const key = `${candidate.commit}:${candidate.path}`;
      if (unique.has(key)) {
        throw new Error("Duplicate candidate commit/path.");
      }
      unique.add(key);

      const actualCommit = git(
        root,
        ["rev-parse", "--verify", `${candidate.commit}^{commit}`]
      ).trim();

      if (actualCommit !== candidate.commit) {
        throw new Error("Commit ID does not resolve exactly.");
      }

      try {
        git(root, [
          "merge-base",
          "--is-ancestor",
          candidate.commit,
          refCommit
        ]);
      } catch {
        throw new Error("Commit is not in trusted branch ancestry.");
      }

      const tree = git(
        root,
        ["ls-tree", "-z", candidate.commit, "--", candidate.path],
        { encoding: "buffer" }
      );

      const entry = tree.toString("utf8").split("\0").filter(Boolean);

      if (entry.length !== 1) {
        throw new Error("File not found at exact commit.");
      }

      const match =
        /^(100644|100755) blob ([a-f0-9]{40}|[a-f0-9]{64})\t(.+)$/
          .exec(entry[0]);

      if (!match || match[3] !== candidate.path) {
        throw new Error("Not a regular file (or path mismatch).");
      }

      const sizeText = git(root, ["cat-file", "-s", match[2]]).trim();
      const size = Number(sizeText);

      if (!Number.isSafeInteger(size) || size > MAX_FILE_BYTES) {
        throw new Error("File exceeds verification size limit.");
      }

      const content = git(
        root,
        ["cat-file", "blob", match[2]],
        { encoding: "buffer" }
      );

      if (content.length !== size) {
        throw new Error("File byte length mismatch.");
      }

      const digest = createHash("sha256")
        .update(content)
        .digest("hex");

      if (digest !== candidate.sha256) {
        throw new Error("SHA-256 digest mismatch.");
      }

      results.push({
        commit: candidate.commit,
        path: candidate.path,
        status: "SOURCE_VERIFIED"
      });

    } catch (error) {
      results.push({
        commit: typeof raw?.commit === "string" ? raw.commit : null,
        path: typeof raw?.path === "string" ? raw.path : null,
        status: "REJECTED",
        reason: error instanceof Error
          ? error.message
          : "Verification failed."
      });
    }
  }

  return {
    repository: TRUSTED_REPOSITORY,
    branch: TRUSTED_BRANCH,
    checked: results.length,
    sourceVerified: results.filter(
      x => x.status === "SOURCE_VERIFIED"
    ).length,
    rejected: results.filter(
      x => x.status === "REJECTED"
    ).length,
    independentApprovals: 0,
    release: "BLOCKED",
    provisioning: "DISABLED",
    financialExecution: "DISABLED",
    results
  };
}

function main() {
  if (process.argv.length !== 3) {
    process.stderr.write(
      "Usage: node backend/governance/staging-provenance-verifier.mjs <manifest.json>\n"
    );
    process.exitCode = 2;
    return;
  }

  if (process.env.GITHUB_REPOSITORY &&
      process.env.GITHUB_REPOSITORY !== TRUSTED_REPOSITORY) {
    throw new Error("GitHub repository identity mismatch.");
  }

  const manifest = JSON.parse(
    readFileSync(process.argv[2], "utf8")
  );

  const report = verifyCandidates(manifest, {
    cwd: process.cwd()
  });

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.rejected > 0) {
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  try {
    main();
  } catch (error) {
    process.stderr.write(
      `PAY54 source verification failed: ${error.message}\n`
    );
    process.exitCode = 1;
  }
}
