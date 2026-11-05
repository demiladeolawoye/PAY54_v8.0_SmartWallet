
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — STAGING EVIDENCE INTAKE
   File: backend/governance/staging-evidence-intake.mjs
   Version: 1.0.0

   Read-only validation of candidate evidence metadata.
   No remote retrieval, secret processing, approval or provisioning.
   ========================================================================== */

import { readFileSync, appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  auditRegister,
  CONTROL_IDS
} from "./staging-evidence-audit.mjs";

const REGISTER_URL = new URL("./staging-evidence-register.json", import.meta.url);
const SUBMISSIONS_URL = new URL("./staging-evidence-submissions.json", import.meta.url);

const SOURCE_SYSTEMS = new Set(["GITHUB", "GOOGLE_CLOUD", "INTERNAL_REVIEW"]);
const SAFE_RECORD_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{7,159}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export function validateEvidenceIntake(register, intake) {
  const errors = [];
  const baseAudit = auditRegister(register);

  if (!baseAudit.valid) {
    errors.push("Baseline staging register is invalid.");
    errors.push(...baseAudit.errors);
  }

  if (!intake || typeof intake !== "object" || Array.isArray(intake)) {
    return { valid: false, errors: [...errors, "Intake must be an object."], count: 0 };
  }

  if (intake.schemaVersion !== "1.0.0" || intake.phase !== "2G-P" ||
      intake.scope !== "staging" ||
      intake.verificationPolicy !== "INDEPENDENT_REVIEW_REQUIRED") {
    errors.push("Intake schema, phase, scope or verification policy is invalid.");
  }

  for (const field of [
    "deploymentAuthorized",
    "provisioningAuthorized",
    "financialExecutionAuthorized"
  ]) {
    if (intake[field] !== false) {
      errors.push(`${field} must be false.`);
    }
  }

  if (!Array.isArray(intake.submissions) || intake.submissions.length > 100) {
    errors.push("Submissions must be an array containing no more than 100 records.");
  }

  const submissions = Array.isArray(intake.submissions) ? intake.submissions : [];
  const seen = new Set();

  for (const [index, entry] of submissions.entries()) {
    const prefix = `Submission ${index + 1}`;

    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      errors.push(`${prefix} must be an object.`);
      continue;
    }

    const expectedFields = [
      "id", "controlId", "sourceSystem", "recordId", "sha256",
      "recordedAt", "submittedBy", "reviewStatus"
    ];
    const keys = Object.keys(entry).sort();

    if (JSON.stringify(keys) !== JSON.stringify([...expectedFields].sort())) {
      errors.push(`${prefix} has missing or unsupported metadata fields.`);
    }

    if (!SAFE_RECORD_ID.test(entry.id ?? "") || seen.has(entry.id)) {
      errors.push(`${prefix} has an invalid or duplicate evidence ID.`);
    }
    seen.add(entry.id);

    if (!CONTROL_IDS.includes(entry.controlId)) {
      errors.push(`${prefix} references an unknown staging control.`);
    }

    if (!SOURCE_SYSTEMS.has(entry.sourceSystem)) {
      errors.push(`${prefix} has an unsupported source system.`);
    }

    if (!SAFE_RECORD_ID.test(entry.recordId ?? "")) {
      errors.push(`${prefix} has an invalid record identifier.`);
    }

    if (!SHA256.test(entry.sha256 ?? "")) {
      errors.push(`${prefix} requires a lowercase SHA-256 digest.`);
    }

    if (!UTC_TIMESTAMP.test(entry.recordedAt ?? "") ||
        !Number.isFinite(Date.parse(entry.recordedAt ?? "")) ||
        new Date(entry.recordedAt ?? 0).toISOString().replace(".000Z", "Z") !==
          (entry.recordedAt ?? "").replace(/\.000Z$/, "Z")) {
      errors.push(`${prefix} requires a valid UTC timestamp.`);
    }

    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,79}$/.test(entry.submittedBy ?? "")) {
      errors.push(`${prefix} requires a non-secret submitter identifier.`);
    }

    if (entry.reviewStatus !== "PENDING_INDEPENDENT_REVIEW") {
      errors.push(`${prefix} cannot self-attest approval or verification.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    count: submissions.length,
    independentlyVerified: 0,
    stagingApproved: false,
    deploymentAuthorized: false
  };
}

export function renderEvidenceIntakeSummary(result) {
  const lines = [
    "## PAY54 Phase 2G-P — Candidate Evidence Intake",
    "",
    "**READ-ONLY — NO APPROVAL OR DEPLOYMENT**",
    "",
    `Validation: **${result.valid ? "PASS" : "FAIL"}**`,
    `Candidate evidence records: **${result.count}**`,
    "Independent verifications: **0**",
    "Staging release: **BLOCKED**",
    "",
    "Metadata checks do not authenticate the source, the digest, the uploader, or reviewer independence.",
    "Evidence records must not contain credentials, personal data, or secret values."
  ];

  if (result.errors.length) {
    lines.push("", "### Validation failures", ...result.errors.map(error => `- ${error}`));
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  const register = JSON.parse(readFileSync(REGISTER_URL, "utf8"));
  const intake = JSON.parse(readFileSync(SUBMISSIONS_URL, "utf8"));
  const result = validateEvidenceIntake(register, intake);
  const report = renderEvidenceIntakeSummary(result);

  process.stdout.write(report);

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, report, "utf8");
  }

  if (!result.valid) process.exitCode = 1;
}

if (process.argv[1] &&
    import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
