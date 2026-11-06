
"use strict";

/* PAY54 Enterprise Phase 2G-T v1.0.0
   Read-only link between Phase 2G-O/P and Phase 2G-S.
   A Git blob digest check is NOT independent approval or proof of origin.
   Never reads secrets, writes source, invokes deployment or authenticates users. */

import { readFileSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { auditRegister, CONTROL_IDS } from "./staging-evidence-audit.mjs";
import { validateEvidenceIntake } from "./staging-evidence-intake.mjs";
import { verifyCandidates, TRUSTED_REPOSITORY } from "./staging-provenance-verifier.mjs";

const DEFAULT_BASE = new URL("./", import.meta.url);
const MAX_BINDINGS = 100;
const COMMIT = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;
const ALLOWED_KEYS = ["commit", "evidenceId", "path"];

function exactKeys(value, keys) {
  return value && typeof value === "object" && !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

function safePath(path) {
  return typeof path === "string" && path.length > 0 && path.length <= 512 &&
    !path.startsWith("/") && !path.startsWith("-") &&
    !path.includes("\\") && !/[\0\r\n]/.test(path) &&
    path.split("/").every(part => part && part !== "." && part !== "..");
}

function rejectAll(submissions, reason) {
  return submissions.map(entry => ({
    evidenceId: typeof entry?.id === "string" ? entry.id : null,
    controlId: typeof entry?.controlId === "string" ? entry.controlId : null,
    status: "REJECTED",
    reason
  }));
}

export function integrateEvidenceSources(register, intake, bindings, options = {}) {
  const registerAudit = auditRegister(register);
  const intakeAudit = validateEvidenceIntake(register, intake);
  const errors = [];
  if (!registerAudit.valid) errors.push("Baseline evidence register invalid.");
  if (!intakeAudit.valid) errors.push("Evidence intake invalid.");

  const submissions = Array.isArray(intake?.submissions) ? intake.submissions : [];
  if (!exactKeys(bindings, ["schemaVersion", "phase", "scope", "bindings"]) ||
      bindings.schemaVersion !== "1.0.0" || bindings.phase !== "2G-T" ||
      bindings.scope !== "staging" || !Array.isArray(bindings.bindings) ||
      bindings.bindings.length > MAX_BINDINGS) {
    errors.push("Binding document shape, version or count invalid.");
  }

  const records = Array.isArray(bindings?.bindings) ? bindings.bindings : [];
  const byId = new Map();
  for (const binding of records) {
    if (!exactKeys(binding, ALLOWED_KEYS) ||
        typeof binding.evidenceId !== "string" ||
        !COMMIT.test(binding.commit) || !safePath(binding.path)) {
      errors.push("Malformed or unsafe source binding.");
      continue;
    }
    if (byId.has(binding.evidenceId)) {
      errors.push("Duplicate source binding identifier.");
    } else {
      byId.set(binding.evidenceId, binding);
    }
  }

  const submissionIds = new Set(submissions.map(x => x?.id));
  for (const key of byId.keys()) {
    if (!submissionIds.has(key)) errors.push("Binding references unknown evidence ID.");
  }
  if (errors.length) {
    return {
      valid: false, errors, candidates: submissions.length,
      sourceVerified: 0, rejected: submissions.length, outstanding: 0,
      independentlyApproved: 0, controlApprovals: 0, release: "BLOCKED",
      deploymentAuthorized: false, provisioningAuthorized: false,
      financialExecutionAuthorized: false,
      records: rejectAll(submissions, "Input policy validation failed.")
    };
  }

  const recordsOut = [];
  for (const entry of submissions) {
    const binding = byId.get(entry.id);
    if (!binding) {
      recordsOut.push({ evidenceId: entry.id, controlId: entry.controlId,
        status: "OUTSTANDING", reason: "No explicit Git source binding." });
      continue;
    }
    if (entry.sourceSystem !== "GITHUB") {
      recordsOut.push({ evidenceId: entry.id, controlId: entry.controlId,
        status: "REJECTED", reason: "Git verification only supports GITHUB evidence." });
      continue;
    }
    const verification = verifyCandidates({
      repository: TRUSTED_REPOSITORY,
      candidates: [{ commit: binding.commit, path: binding.path, sha256: entry.sha256 }]
    }, options);
    const result = verification.results[0];
    recordsOut.push({
      evidenceId: entry.id, controlId: entry.controlId,
      status: result?.status === "SOURCE_VERIFIED" ? "SOURCE_VERIFIED" : "REJECTED",
      ...(result?.status !== "SOURCE_VERIFIED" ?
        { reason: result?.reason ?? "Git verification failed." } : {})
    });
  }

  return {
    valid: true, errors: [], candidates: submissions.length,
    sourceVerified: recordsOut.filter(x => x.status === "SOURCE_VERIFIED").length,
    rejected: recordsOut.filter(x => x.status === "REJECTED").length,
    outstanding: recordsOut.filter(x => x.status === "OUTSTANDING").length,
    independentlyApproved: 0, controlApprovals: 0,
    requiredControls: CONTROL_IDS.length, release: "BLOCKED",
    deploymentAuthorized: false, provisioningAuthorized: false,
    financialExecutionAuthorized: false, records: recordsOut
  };
}

export function renderIntegrationSummary(result) {
  const clean = value => String(value ?? "").replace(/[|\r\n]/g, " ").slice(0, 200);
  const lines = [
    "## PAY54 Phase 2G-T — Evidence Source Integration",
    "",
    "**READ-ONLY SOURCE INTEGRITY — NOT INDEPENDENT APPROVAL**",
    "",
    `Input validation: **${result.valid ? "PASS" : "FAIL"}**`,
    `Candidate submissions: **${result.candidates}**`,
    `Git source verified: **${result.sourceVerified}**`,
    `Rejected: **${result.rejected}**`,
    `Outstanding: **${result.outstanding}**`,
    "Independently approved: **0**",
    "Staging release: **BLOCKED**",
    "Provisioning: **DISABLED**",
    "Financial execution: **DISABLED**",
    "",
    "| Evidence ID | Control | Source integrity | Reason |",
    "| --- | --- | --- | --- |"
  ];
  for (const record of result.records) {
    lines.push(`| ${clean(record.evidenceId)} | ${clean(record.controlId)} | ${clean(record.status)} | ${clean(record.reason)} |`);
  }
  if (result.errors.length) {
    lines.push("", "### Policy errors", ...result.errors.map(e => `- ${clean(e)}`));
  }
  lines.push("", "A matching Git digest does not authenticate the submitter, verify provenance, satisfy a control, or authorise deployment.");
  return `${lines.join("\n")}\n`;
}

function loadJson(url) { return JSON.parse(readFileSync(url, "utf8")); }

function main() {
  const base = DEFAULT_BASE;
  const bindingsFile = process.argv[2];
  if (!bindingsFile || process.argv.length !== 3) {
    throw new Error("Usage: node backend/governance/staging-evidence-source-integration.mjs <bindings.json>");
  }
  const result = integrateEvidenceSources(
    loadJson(new URL("staging-evidence-register.json", base)),
    loadJson(new URL("staging-evidence-submissions.json", base)),
    loadJson(resolve(bindingsFile)),
    { cwd: process.cwd() }
  );
  const summary = renderIntegrationSummary(result);
  process.stdout.write(summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary, "utf8");
  }
  if (!result.valid || result.rejected > 0) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try { main(); } catch (error) {
    process.stderr.write(`PAY54 evidence integration failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
