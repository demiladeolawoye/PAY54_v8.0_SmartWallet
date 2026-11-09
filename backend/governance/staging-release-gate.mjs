
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — CONSOLIDATED STAGING RELEASE GATE
   File: backend/governance/staging-release-gate.mjs
   Version: 1.0.0 | Phase: 2G-U

   Read-only, fail-closed assessment. Passing the integrity check NEVER
   authorises provisioning, container deployment or financial execution.
   Existing STG-01..STG-07 control identifiers are preserved.
   ========================================================================== */

import { readFileSync, appendFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { auditRegister, CONTROL_IDS } from "./staging-evidence-audit.mjs";
import { validateEvidenceIntake } from "./staging-evidence-intake.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const REGISTER = "backend/governance/staging-evidence-register.json";
const INTAKE = "backend/governance/staging-evidence-submissions.json";

const EXPECTED_WORKFLOWS = Object.freeze([
  ".github/workflows/pay54-staging-evidence.yml",
  ".github/workflows/pay54-staging-evidence-intake.yml",
  ".github/workflows/pay54-staging-evidence-source-integration.yml",
  ".github/workflows/pay54-staging-deploy.yml"
]);

const BLOCKED_STATUSES = new Set([
  "BLOCKED",
  "NOT_CONFIGURED",
  "NOT_VERIFIED"
]);

const GATE_FIELDS = Object.freeze([
  "deploymentAuthorized",
  "provisioningAuthorized",
  "financialExecutionAuthorized"
]);

function readJson(root, relative) {
  return JSON.parse(
    readFileSync(resolve(root, relative), "utf8")
  );
}

function safeText(value) {
  return String(value ?? "")
    .replace(/[|\r\n]/g, " ")
    .slice(0, 240);
}

/**
 * Inputs are existing PAY54 governance documents.
 * A source-integrity check cannot authenticate cloud state
 * or an independent human approver.
 */
export function assessStagingRelease(register, intake, inventory = {}) {
  const errors = [];
  let registerAudit;
  let intakeAudit;

  try {
    registerAudit = auditRegister(register);

    if (!registerAudit.valid) {
      errors.push(
        ...registerAudit.errors.map(x => `Register: ${x}`)
      );
    }
  } catch (error) {
    errors.push(`Register audit failed: ${error.message}`);
  }

  try {
    intakeAudit = validateEvidenceIntake(register, intake);

    if (!intakeAudit.valid) {
      errors.push(
        ...intakeAudit.errors.map(x => `Intake: ${x}`)
      );
    }
  } catch (error) {
    errors.push(`Intake audit failed: ${error.message}`);
  }

  for (const [name, present] of Object.entries(inventory)) {
    if (present !== true && present !== false) {
      errors.push(`Invalid inventory result: ${name}`);
    }
  }

  const missingWorkflows = Object.entries(inventory)
    .filter(([, present]) => present === false)
    .map(([name]) => name);

  for (const field of GATE_FIELDS) {
    if (
      register?.[field] !== false ||
      intake?.[field] !== false
    ) {
      errors.push(
        `${field} must remain false in both evidence inputs.`
      );
    }
  }

  const controls = CONTROL_IDS.map(id => {
    const control = Array.isArray(register?.controls)
      ? register.controls.find(entry => entry?.id === id)
      : null;

    const status = BLOCKED_STATUSES.has(control?.status)
      ? control.status
      : "BLOCKED";

    return {
      id,
      name: safeText(control?.name || "Missing control"),
      status,
      evidenceCount: Array.isArray(control?.evidence)
        ? control.evidence.length
        : 0,
      independentApproval: false
    };
  });

  return Object.freeze({
    schemaVersion: "1.0.0",
    phase: "2G-U",
    integrityPassed: errors.length === 0,
    errors,
    missingWorkflows,
    controls,
    candidateEvidence: Number.isInteger(intakeAudit?.count)
      ? intakeAudit.count
      : 0,
    authenticatedVerifications: 0,
    independentlyApprovedControls: 0,
    release: "BLOCKED",
    deploymentAuthorized: false,
    provisioningAuthorized: false,
    financialExecutionAuthorized: false,
    note:
      "Offline metadata validation is not cloud attestation " +
      "or independent release approval."
  });
}

export function renderGateSummary(report) {
  const lines = [
    "## PAY54 Phase 2G-U — Consolidated Staging Release Gate",
    "",
    "**READ-ONLY EVIDENCE ASSESSMENT — NOT A RELEASE APPROVAL**",
    "",
    `Source-policy integrity: **${report.integrityPassed ? "PASS" : "FAIL"}**`,
    `Staging release: **${report.release}**`,
    "Cloud provisioning: **DISABLED**",
    "Financial execution: **DISABLED**",
    `Candidate evidence: **${report.candidateEvidence}**`,
    "Independently authenticated approvals: **0**",
    "",
    "| Control | Existing description | Register status | Independently approved |",
    "| --- | --- | --- | --- |"
  ];

  for (const control of report.controls) {
    lines.push(
      `| ${safeText(control.id)} | ${safeText(control.name)} | ` +
      `${safeText(control.status)} | NO |`
    );
  }

  lines.push(
    "",
    "### Workflow inventory (presence only)"
  );

  if (report.missingWorkflows.length) {
    lines.push(
      ...report.missingWorkflows.map(
        path => `- Not present in this checkout: \`${safeText(path)}\``
      )
    );
  } else {
    lines.push(
      "- All monitored workflow paths are present; " +
      "their presence does not establish approval."
    );
  }

  if (report.errors.length) {
    lines.push(
      "",
      "### Integrity errors",
      ...report.errors.map(err => `- ${safeText(err)}`)
    );
  }

  lines.push(
    "",
    report.note,
    "This workflow cannot grant approval, activate GitHub federation, " +
    "access cloud credentials, provision infrastructure or deploy an image."
  );

  return `${lines.join("\n")}\n`;
}

export function evaluateCheckout(root = ROOT) {
  const inventory = Object.fromEntries(
    EXPECTED_WORKFLOWS.map(path => [
      path,
      existsSync(resolve(root, path))
    ])
  );

  return assessStagingRelease(
    readJson(root, REGISTER),
    readJson(root, INTAKE),
    inventory
  );
}

function main() {
  let report;

  try {
    report = evaluateCheckout();
  } catch (error) {
    process.stderr.write(
      `PAY54 gate failed closed: ${error.message}\n`
    );
    process.exitCode = 1;
    return;
  }

  const output = renderGateSummary(report);
  process.stdout.write(output);

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      output,
      "utf8"
    );
  }

  // A blocked release is the expected safe result,
  // not a CI integrity failure.
  if (!report.integrityPassed) {
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
