
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — STAGING EVIDENCE PROVENANCE POLICY
   File: backend/governance/staging-provenance-policy.mjs
   Version: 1.0.0

   Purpose:
   Validate the structure of candidate provenance records.

   Security boundary:
   - Source metadata is not authenticated here.
   - File hashes are not independently recalculated here.
   - No candidate can become an approved deployment.
   - No cloud credentials or financial execution.
   ========================================================================== */

const REPOSITORY =
  "demiladeolawoye/PAY54_v8.0_SmartWallet";

const BRANCH = "project-titan";

const SCHEMA = "1.0.0";

const REQUIRED_FIELDS = Object.freeze([
  "id",
  "controlId",
  "commitSha",
  "filePath",
  "sha256",
  "submittedBy",
  "submittedAt"
]);

const ALLOWED_STATUSES = Object.freeze([
  "UNVERIFIED"
]);

const own = (obj, key) =>
  Object.prototype.hasOwnProperty.call(obj, key);

function strictKeys(value, allowed) {
  return Object.keys(value).every(key =>
    allowed.includes(key)
  );
}

function validTimestamp(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  ) {
    return false;
  }

  const parsed = new Date(value);

  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString() === value
  );
}

function validPath(value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 512 ||
    value.includes("\\") ||
    value.startsWith("/") ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return false;
  }

  const segments = value.split("/");

  return segments.every(segment =>
    segment.length > 0 &&
    segment !== "." &&
    segment !== ".."
  );
}

export function validateProvenanceCandidates(document) {
  const errors = [];

  const fail = message => {
    errors.push(message);
  };

  if (
    document === null ||
    typeof document !== "object" ||
    Array.isArray(document)
  ) {
    return Object.freeze({
      valid: false,
      candidateCount: 0,
      authenticatedCount: 0,
      stagingApproved: false,
      deploymentAuthorized: false,
      errors: ["Provenance document must be an object."]
    });
  }

  const rootFields = [
    "schemaVersion",
    "repository",
    "branch",
    "deploymentAuthorized",
    "provisioningAuthorized",
    "financialExecutionAuthorized",
    "candidates"
  ];

  if (!strictKeys(document, rootFields)) {
    fail("Unexpected root field detected.");
  }

  if (document.schemaVersion !== SCHEMA) {
    fail("Unsupported provenance schema.");
  }

  if (document.repository !== REPOSITORY) {
    fail("Unexpected repository.");
  }

  if (document.branch !== BRANCH) {
    fail("Unexpected branch.");
  }

  for (const flag of [
    "deploymentAuthorized",
    "provisioningAuthorized",
    "financialExecutionAuthorized"
  ]) {
    if (document[flag] !== false) {
      fail(`${flag} must remain false.`);
    }
  }

  if (!Array.isArray(document.candidates)) {
    fail("Candidates must be an array.");
  } else if (document.candidates.length > 1000) {
    fail("Candidate count exceeds the review limit.");
  } else {
    const identifiers = new Set();

    document.candidates.forEach((record, index) => {
      const prefix = `Candidate ${index + 1}`;

      if (
        record === null ||
        typeof record !== "object" ||
        Array.isArray(record)
      ) {
        fail(`${prefix}: invalid record.`);
        return;
      }

      if (
        !strictKeys(record, [
          ...REQUIRED_FIELDS,
          "status"
        ])
      ) {
        fail(`${prefix}: unexpected field.`);
      }

      for (const field of REQUIRED_FIELDS) {
        if (!own(record, field)) {
          fail(`${prefix}: missing ${field}.`);
        }
      }

      if (
        typeof record.id !== "string" ||
        !/^EV-[0-9]{3,8}$/.test(record.id)
      ) {
        fail(`${prefix}: invalid evidence ID.`);
      } else if (identifiers.has(record.id)) {
        fail(`${prefix}: duplicate evidence ID.`);
      } else {
        identifiers.add(record.id);
      }

      if (
        typeof record.controlId !== "string" ||
        !/^STG-[0-9]{2,4}$/.test(record.controlId)
      ) {
        fail(`${prefix}: invalid control ID.`);
      }

      if (
        typeof record.commitSha !== "string" ||
        !/^[a-f0-9]{40}$/.test(record.commitSha)
      ) {
        fail(`${prefix}: invalid Git commit SHA.`);
      }

      if (!validPath(record.filePath)) {
        fail(`${prefix}: unsafe evidence path.`);
      }

      if (
        typeof record.sha256 !== "string" ||
        !/^[a-f0-9]{64}$/.test(record.sha256)
      ) {
        fail(`${prefix}: invalid SHA-256 digest.`);
      }

      if (
        typeof record.submittedBy !== "string" ||
        !/^github:[A-Za-z0-9](?:[A-Za-z0-9-]{0,37})$/.test(
          record.submittedBy
        )
      ) {
        fail(`${prefix}: invalid submitter claim.`);
      }

      if (!validTimestamp(record.submittedAt)) {
        fail(`${prefix}: invalid submission timestamp.`);
      }

      if (
        !ALLOWED_STATUSES.includes(record.status)
      ) {
        fail(
          `${prefix}: only UNVERIFIED is permitted.`
        );
      }
    });
  }

  return Object.freeze({
    valid: errors.length === 0,
    candidateCount: Array.isArray(document.candidates)
      ? document.candidates.length
      : 0,
    authenticatedCount: 0,
    stagingApproved: false,
    deploymentAuthorized: false,
    errors
  });
}

export function renderProvenanceSummary(result) {
  const status = result.valid ? "PASS" : "FAIL";

  return [
    "## PAY54 Phase 2G-R — Evidence Provenance Readiness",
    "",
    "**READ-ONLY METADATA VALIDATION — NOT AUTHENTICATION**",
    "",
    `Validation: ${status}`,
    `Candidate records: ${result.candidateCount}`,
    "Authenticated source records: 0",
    "Independently approved records: 0",
    "Staging release: BLOCKED",
    "Cloud provisioning: DISABLED",
    "Financial execution: DISABLED",
    "",
    "Record structure alone cannot establish source authenticity.",
    "Future verification must independently retrieve the GitHub",
    "commit and file, recalculate the SHA-256 digest, and",
    "authenticate an independent reviewer.",
    "",
    ...result.errors.map(error => `- ERROR: ${error}`)
  ].join("\n");
}
