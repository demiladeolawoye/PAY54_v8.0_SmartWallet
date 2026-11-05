
"use strict";

/* PAY54 ENTERPRISE — Phase 2G-O: read-only staging evidence audit v1.0.0 */

import { readFileSync, appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

export const CONTROL_IDS = Object.freeze([
  "STG-01", "STG-02", "STG-03", "STG-04",
  "STG-05", "STG-06", "STG-07"
]);

export const ACCEPTED_STATUSES = Object.freeze([
  "NOT_CONFIGURED", "NOT_VERIFIED", "BLOCKED"
]);

const DEFAULT_REGISTER = new URL(
  "./staging-evidence-register.json",
  import.meta.url
);

export function auditRegister(register) {
  const errors = [];

  if (!register || typeof register !== "object" ||
      Array.isArray(register)) {
    return {
      valid: false,
      errors: ["Register must be an object."],
      summary: null
    };
  }

  if (register.schemaVersion !== "1.0.0" ||
      register.phase !== "2G-O" ||
      register.scope !== "staging") {
    errors.push("Register version, phase or scope is invalid.");
  }

  for (const field of [
    "deploymentAuthorized",
    "provisioningAuthorized",
    "financialExecutionAuthorized"
  ]) {
    if (register[field] !== false) {
      errors.push(`${field} must remain false.`);
    }
  }

  if (!Array.isArray(register.controls) ||
      register.controls.length !== CONTROL_IDS.length) {
    errors.push("Exactly seven staging controls are required.");
  }

  const controls = Array.isArray(register.controls)
    ? register.controls
    : [];

  const ids = new Set();

  for (const control of controls) {
    if (!control || typeof control !== "object" ||
        Array.isArray(control)) {
      errors.push("Every control must be an object.");
      continue;
    }

    if (!CONTROL_IDS.includes(control.id) ||
        ids.has(control.id)) {
      errors.push(
        `Unknown or duplicate control ID: ${String(control.id)}`
      );
    }

    ids.add(control.id);

    for (const field of [
      "name",
      "accountableRole",
      "verifierRole",
      "acceptanceCriteria"
    ]) {
      if (typeof control[field] !== "string" ||
          !control[field].trim()) {
        errors.push(`${String(control.id)}: missing ${field}.`);
      }
    }

    if (!ACCEPTED_STATUSES.includes(control.status)) {
      errors.push(
        `${String(control.id)}: unapproved status; ` +
        "no control may be marked verified by this register."
      );
    }

    if (!Array.isArray(control.evidence) ||
        control.evidence.length !== 0) {
      errors.push(
        `${String(control.id)}: evidence must remain empty ` +
        "until a separate independently verified evidence process exists."
      );
    }
  }

  for (const id of CONTROL_IDS) {
    if (!ids.has(id)) {
      errors.push(`Missing required control ${id}.`);
    }
  }

  const counts = Object.fromEntries(
    ACCEPTED_STATUSES.map(status => [
      status,
      controls.filter(control => control?.status === status).length
    ])
  );

  return {
    valid: errors.length === 0,
    errors,
    summary: {
      totalControls: controls.length,
      ...counts,
      verified: 0,
      stagingApproved: false,
      deploymentAuthorized: false
    }
  };
}

export function renderSummary(register, audit) {
  const lines = [
    "## PAY54 Phase 2G-O — Staging Evidence and Approval Register",
    "",
    "**READ-ONLY INVENTORY — NOT STAGING APPROVAL**",
    "",
    "No cloud credentials, external API calls, provisioning, deployment or payment execution.",
    "",
    `Register validation: **${audit.valid ? "PASS" : "FAIL"}**`,
    "",
    "| Control | Accountable role | Independent verifier role | Status |",
    "| --- | --- | --- | --- |"
  ];

  for (const control of register.controls ?? []) {
    const clean = value => String(value ?? "")
      .replaceAll("|", "\\|")
      .replaceAll("\n", " ");

    lines.push(
      `| ${clean(control.id)} — ${clean(control.name)} | ` +
      `${clean(control.accountableRole)} | ` +
      `${clean(control.verifierRole)} | ` +
      `${clean(control.status)} |`
    );
  }

  lines.push(
    "",
    "**Verified: 0 / 7. Staging release: BLOCKED.**",
    "",
    "Passing this workflow confirms only that the evidence register is complete and fail-closed.",
    "Independent evidence validation and a separate release decision remain required."
  );

  if (audit.errors.length) {
    lines.push(
      "",
      "### Validation errors",
      ...audit.errors.map(error => `- ${error}`)
    );
  }

  return `${lines.join("\n")}\n`;
}

export function readRegister(url = DEFAULT_REGISTER) {
  return JSON.parse(readFileSync(url, "utf8"));
}

function main() {
  const register = readRegister();
  const audit = auditRegister(register);
  const summary = renderSummary(register, audit);

  process.stdout.write(summary);

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      summary,
      { encoding: "utf8" }
    );
  }

  if (!audit.valid) {
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main();
}
