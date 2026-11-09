
"use strict";

/* PAY54 Enterprise — Phase 2G-V: read-only evidence reconciliation v1.0.0.
   This report records unverified user-provided observations. It does not
   certify cloud state, authenticate reviewers or modify any baseline file. */

import { appendFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { auditRegister, CONTROL_IDS } from "./staging-evidence-audit.mjs";
import { validateEvidenceIntake } from "./staging-evidence-intake.mjs";
import { assessStagingRelease } from "./staging-release-gate.mjs";

const FIELD_FLAGS = Object.freeze([
  "deploymentAuthorized", "provisioningAuthorized", "financialExecutionAuthorized"
]);
const ASSESSMENTS = new Set([
  "PARTIAL_OBSERVATION", "NOT_RUNTIME_VERIFIED", "BLOCKING_GAP"
]);
const REQUIRED_OBSERVATION_FIELDS = [
  "id", "controlId", "finding", "sourceReference", "assessment"
].sort();
const ID_PATTERN = /^OBS-STG\d{2}-\d{3}$/;
const CLEAN_STRING = /^[^\x00-\x1f\x7f<>]{12,500}$/;

function exactFields(value, expected) {
  return Object.keys(value).sort().join("\u0000") === [...expected].sort().join("\u0000");
}

function clean(value) {
  return String(value ?? "").replace(/[|\r\n<>]/g, " ").slice(0, 480);
}

export function reconcileStagingEvidence(register, intake, observations) {
  const errors = [];
  const base = auditRegister(register);
  const candidates = validateEvidenceIntake(register, intake);
  const gate = assessStagingRelease(register, intake);

  if (!base.valid) errors.push("Baseline register failed integrity verification.");
  if (!candidates.valid) errors.push("Candidate intake failed integrity verification.");
  if (!gate.integrityPassed) errors.push("Consolidated release gate failed integrity verification.");

  if (!observations || typeof observations !== "object" || Array.isArray(observations)) {
    errors.push("Observations register must be an object.");
  } else {
    const expected = [
      "schemaVersion", "phase", "scope", "sourceClass", "authentication",
      "reviewState", ...FIELD_FLAGS, "observations"
    ];
    if (!exactFields(observations, expected)) errors.push("Unexpected or missing top-level fields.");
    if (observations.schemaVersion !== "1.0.0" || observations.phase !== "2G-V" || observations.scope !== "staging") {
      errors.push("Invalid observation schema, phase or scope.");
    }
    if (observations.sourceClass !== "USER_PROVIDED_CONSOLE_SCREENSHOTS" ||
        observations.authentication !== "NOT_AUTHENTICATED" ||
        observations.reviewState !== "INDEPENDENT_REVIEW_REQUIRED") {
      errors.push("Observations must remain explicitly unauthenticated and pending review.");
    }
    for (const flag of FIELD_FLAGS) {
      if (observations[flag] !== false) errors.push(`${flag} must be false.`);
    }
    if (!Array.isArray(observations.observations) || observations.observations.length > 100) {
      errors.push("Observation records must be an array of no more than 100 items.");
    }
  }

  const entries = Array.isArray(observations?.observations) ? observations.observations : [];
  const observedIds = new Set();

  for (const [index, entry] of entries.entries()) {
    const label = `Observation ${index + 1}`;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      errors.push(`${label}: invalid record.`);
      continue;
    }
    if (!exactFields(entry, REQUIRED_OBSERVATION_FIELDS)) errors.push(`${label}: unsupported or missing fields.`);
    if (typeof entry.id !== "string" || !ID_PATTERN.test(entry.id) || observedIds.has(entry.id)) {
      errors.push(`${label}: invalid or duplicate observation ID.`);
    }
    observedIds.add(entry.id);
    if (!CONTROL_IDS.includes(entry.controlId) || entry.id?.slice(4, 9) !== entry.controlId?.replace("-", "")) {
      errors.push(`${label}: invalid control reference.`);
    }
    if (typeof entry.finding !== "string" || !CLEAN_STRING.test(entry.finding) ||
        typeof entry.sourceReference !== "string" || !CLEAN_STRING.test(entry.sourceReference)) {
      errors.push(`${label}: finding or source reference is not safe non-secret text.`);
    }
    if (!ASSESSMENTS.has(entry.assessment)) errors.push(`${label}: invalid assessment.`);
  }

  const controls = CONTROL_IDS.map(id => {
    const control = register?.controls?.find(entry => entry?.id === id);
    const matching = entries.filter(entry => entry?.controlId === id);
    return {
      id,
      name: control?.name ?? "Missing baseline control",
      baselineStatus: control?.status ?? "BLOCKED",
      observationCount: matching.length,
      observations: matching.map(entry => ({
        id: entry.id, assessment: entry.assessment,
        finding: entry.finding, sourceReference: entry.sourceReference
      })),
      authenticatedEvidence: 0,
      independentlyApproved: false
    };
  });

  return {
    schemaVersion: "1.0.0",
    phase: "2G-V",
    integrityPassed: errors.length === 0,
    errors,
    candidateCount: candidates.count ?? 0,
    screenshotObservations: entries.length,
    authenticatedEvidence: 0,
    independentApprovals: 0,
    controls,
    release: "BLOCKED",
    deploymentAuthorized: false,
    provisioningAuthorized: false,
    financialExecutionAuthorized: false
  };
}

export function renderReconciliationSummary(result) {
  const lines = [
    "## PAY54 Phase 2G-V — Staging Evidence Reconciliation",
    "",
    "**READ-ONLY SELF-REPORTED OBSERVATIONS — NOT CLOUD ATTESTATION**",
    "",
    `Input integrity: **${result.integrityPassed ? "PASS" : "FAIL"}**`,
    `Screen-based observations: **${result.screenshotObservations}**`,
    `Candidate evidence records: **${result.candidateCount}**`,
    "Authenticated cloud evidence: **0**",
    "Independently authenticated approvals: **0**",
    "Staging release: **BLOCKED**",
    "Provisioning: **DISABLED**",
    "Financial execution: **DISABLED**",
    "",
    "| Control | Baseline status | Unauthenticated observations | Approval |",
    "| --- | --- | ---: | --- |"
  ];

  for (const control of result.controls) {
    lines.push(`| ${clean(control.id)} — ${clean(control.name)} | ${clean(control.baselineStatus)} | ${control.observationCount} | NO |`);
  }

  lines.push("", "### Outstanding evidence and independent review");
  for (const control of result.controls) {
    for (const item of control.observations) {
      lines.push(`- **${clean(control.id)} (${clean(item.assessment)})**: ${clean(item.finding)} Source: ${clean(item.sourceReference)}.`);
    }
  }
  if (result.errors.length) {
    lines.push("", "### Validation errors", ...result.errors.map(error => `- ${clean(error)}`));
  }
  lines.push("", "Screenshots do not authenticate cloud configuration, source integrity, reviewer independence or approval. No baseline governance status has been updated.");
  return `${lines.join("\n")}\n`;
}

function readJson(name) {
  return JSON.parse(readFileSync(new URL(name, import.meta.url), "utf8"));
}

function main() {
  let result;
  try {
    result = reconcileStagingEvidence(
      readJson("staging-evidence-register.json"),
      readJson("staging-evidence-submissions.json"),
      readJson("staging-observations.json")
    );
  } catch (error) {
    process.stderr.write(`PAY54 reconciliation failed closed: ${error.message}\n`);
    process.exitCode = 1;
    return;
  }
  const report = renderReconciliationSummary(result);
  process.stdout.write(report);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, report, "utf8");
  }
  if (!result.integrityPassed) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
