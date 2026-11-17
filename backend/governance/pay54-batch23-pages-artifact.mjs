"use strict";

/**
 * PAY54 Batch 23 / 907 — Pages candidate artifact allow-boundary scan.
 *
 * This does not fetch GitHub Pages or prove public exposure/containment.
 * It rejects source/private files supplied by a trusted build manifest before
 * a future release. An artifact must still undergo independent live audit.
 */
const denied = /(?:^|\/)(?:backend|docs|infra|infrastructure|scripts|tests|test|\.github|\.git|node_modules|private|secrets)(?:\/|$)|(?:^|\/)(?:\.env(?:\.|$)|[^/]+\.(?:pem|key|p12|pfx|sql|sqlite|db|map))$|(?:^|\/)linked-card-development\.(?:js|mjs)$/i;
const valid = /^[a-zA-Z0-9._/@()+-]+$/;
const deny = () => { throw new Error("PAY54_PAGES_ARTIFACT_BOUNDARY_DENIED"); };

export function inspectPay54PagesCandidateArtifact({ filePaths } = {}) {
  if (!Array.isArray(filePaths) || filePaths.length < 1 ||
      filePaths.length > 10000) deny();
  const seen = new Set();
  const blocked = [];
  for (const path of filePaths) {
    if (typeof path !== "string" || path.length > 512 ||
        !valid.test(path) || path.startsWith("/") ||
        path.endsWith("/") || path.includes("//") ||
        path.split("/").includes("..") ||
        path.split("/").includes(".") ||
        seen.has(path)) deny();
    seen.add(path);
    if (denied.test(path)) blocked.push(path);
  }
  return Object.freeze({
    schema: "pay54.pages-build-artifact-boundary.v1",
    fileCount: seen.size,
    prohibitedFiles: Object.freeze(blocked),
    candidateSourceBoundaryPassed: blocked.length === 0,
    currentPublicPagesInspected: false,
    historicalExposureResolved: false,
    deploymentAuthorised: false
  });
}
