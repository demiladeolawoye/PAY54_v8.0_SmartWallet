"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { inspectPay54PagesCandidateArtifact as inspect }
  from "../governance/pay54-batch23-pages-artifact.mjs";

test("908: candidate static assets pass inspection but cannot establish public containment", () => {
  const result = inspect({
    filePaths: ["index.html", "dashboard.html", "assets/css/dashboard.css",
      "assets/js/dashboard-core.js", "assets/icons/wallet.svg"]
  });
  assert.equal(result.fileCount, 5);
  assert.equal(result.candidateSourceBoundaryPassed, true);
  assert.equal(result.historicalExposureResolved, false);
  assert.equal(result.deploymentAuthorised, false);
  assert.ok(Object.isFrozen(result.prohibitedFiles));
});

test("908: backend, documents, raw SQL and development provider fail candidate gate", () => {
  const result = inspect({
    filePaths: [
      "index.html",
      "backend/src/server.mjs",
      "docs/engineering/internal.md",
      ".github/workflows/release.yml",
      "backend/db/migrations/018_account_session_rotation.sql",
      "assets/js/infrastructure/payments/providers/linked-card-development.js"
    ]
  });
  assert.equal(result.candidateSourceBoundaryPassed, false);
  assert.ok(result.prohibitedFiles.includes("backend/src/server.mjs"));
  assert.ok(result.prohibitedFiles.includes(
    "assets/js/infrastructure/payments/providers/linked-card-development.js"));
});

test("908: traversal, duplicate and unbounded manifests are rejected", () => {
  for (const filePaths of [
    [], ["../secret.txt"], ["assets//app.js"], ["/index.html"],
    ["a.js", "a.js"], [".git/../secrets"], ["assets\\private.txt"]
  ]) assert.throws(() => inspect({ filePaths }), /PAGES_ARTIFACT_BOUNDARY_DENIED/);
});
