
"use strict";

/* PAY54 Phase 2G-W — independent reviewer preparation, v1.0.0.
   Offline, additive, no external calls, no credential access, no approvals. */
import { readFileSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { CONTROL_IDS } from "./staging-evidence-audit.mjs";
import { reconcileStagingEvidence } from "./staging-evidence-reconciliation.mjs";

const REQUIREMENTS = Object.freeze({
  "STG-02": Object.freeze([
    "Reviewer independently checks Google Cloud project ID, number and resource ownership using an authenticated read-only session.",
    "Reviewer checks effective project-to-billing linkage and active billing account status without exposing payment details.",
    "Reviewer documents regional and ownership requirements against the approved staging design."
  ]),
  "STG-03": Object.freeze([
    "Reviewer independently inspects the current Secret Manager API state and global/regional inventories without reading secret payloads.",
    "Reviewer checks effective IAM and inherited grants, including privileged and secret-access roles.",
    "Reviewer verifies the effective service-account key creation/upload restrictions; no-organisation policy screen is inconclusive.",
    "Reviewer confirms Secret Manager audit logging settings and verifies an appropriate audit event only when a safe authorised event exists.",
    "Reviewer reviews future dedicated workload identity, least privilege and secret rotation/revocation procedures before deployment."
  ]),
  "STG-04": Object.freeze([
    "Reviewer independently confirms monthly GBP 25 alerts-only budget, project scope and all-services coverage.",
    "Reviewer independently confirms actual-spend alert thresholds of 50%, 80% and 100%.",
    "Reviewer verifies named notification recipients and safely establishes whether alerts reach them.",
    "Reviewer documents that a billing budget is not a hard spending cap or guaranteed cost ceiling."
  ])
});

const REVIEWER_CONTROLS = Object.freeze(["STG-02", "STG-03", "STG-04"]);

function safe(value) {
  return String(value ?? "")
    .replace(/[\x00-\x1f\x7f<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 650);
}

export function compileReviewerPacket(register, intake, observations) {
  const reconciled = reconcileStagingEvidence(register, intake, observations);
  const errors = [...reconciled.errors];

  if (
    JSON.stringify(reconciled.controls.map(c => c.id)) !==
    JSON.stringify(CONTROL_IDS)
  ) {
    errors.push("Control identity or ordering is inconsistent.");
  }

  if (
    reconciled.release !== "BLOCKED" ||
    reconciled.authenticatedEvidence !== 0 ||
    reconciled.independentApprovals !== 0 ||
    reconciled.deploymentAuthorized !== false ||
    reconciled.provisioningAuthorized !== false ||
    reconciled.financialExecutionAuthorized !== false
  ) {
    errors.push("Unexpected release, authentication or execution state.");
  }

  for (const id of REVIEWER_CONTROLS) {
    const item = reconciled.controls.find(c => c.id === id);

    if (
      !item ||
      item.observations.length !== 1 ||
      item.baselineStatus !== "NOT_CONFIGURED"
    ) {
      errors.push(
        `${id}: expected one unauthenticated observation and unchanged NOT_CONFIGURED baseline status.`
      );
    }
  }

  const controls = REVIEWER_CONTROLS.map(id => {
    const matched = reconciled.controls.find(c => c.id === id);

    return Object.freeze({
      id,
      name: matched?.name ?? "Missing control",
      baselineStatus: matched?.baselineStatus ?? "BLOCKED",
      observationIds: (matched?.observations ?? []).map(o => o.id),
      observations: (matched?.observations ?? []).map(o => o.finding),
      reviewerRequirements: [...REQUIREMENTS[id]],
      evidenceAuthenticated: false,
      independentlyApproved: false
    });
  });

  return Object.freeze({
    schemaVersion: "1.0.0",
    phase: "2G-W",
    integrityPassed: errors.length === 0,
    errors,
    controls,
    sourceClass: "UNAUTHENTICATED_USER_SCREENSHOT_OBSERVATIONS",
    independentReviewerAssigned: false,
    authenticatedEvidenceCount: 0,
    independentApprovalCount: 0,
    release: "BLOCKED",
    provisioningAuthorized: false,
    deploymentAuthorized: false,
    financialExecutionAuthorized: false
  });
}

export function renderReviewerPacket(packet) {
  const out = [
    "## PAY54 Phase 2G-W — Independent Reviewer Evidence Preparation",
    "",
    "**OFFLINE REVIEW PACKET — NOT LIVE CLOUD ATTESTATION OR RELEASE APPROVAL**",
    "",
    `Source integrity: **${packet.integrityPassed ? "PASS" : "FAIL"}**`,
    "Evidence source: **Unauthenticated user-provided screenshots**",
    "Independent reviewer assigned: **NO**",
    "Authenticated cloud evidence: **0**",
    "Independent approvals: **0**",
    "Staging release: **BLOCKED**",
    "Cloud provisioning: **DISABLED**",
    "Financial execution: **DISABLED**",
    "",
    "The observations below are preliminary. An independent reviewer must obtain fresh authenticated evidence, validate source integrity, and record a decision outside this offline report."
  ];

  for (const control of packet.controls) {
    out.push(
      "",
      `### ${safe(control.id)} — ${safe(control.name)}`,
      "",
      `Existing register status: **${safe(control.baselineStatus)}**; independently approved: **NO**.`,
      "",
      `Observation reference(s): ${control.observationIds.map(id => `\`${safe(id)}\``).join(", ")}.`,
      "",
      "**Reported observation (unverified)**:"
    );

    for (const finding of control.observations) {
      out.push(`- ${safe(finding)}`);
    }

    out.push("", "**Required independent verification**:");

    for (const requirement of control.reviewerRequirements) {
      out.push(`- [ ] ${safe(requirement)}`);
    }
  }

  out.push(
    "",
    "### Independent reviewer handoff requirements",
    "",
    "- Reviewer must be a real, independently accountable person with appropriate technical competence and least-privilege access.",
    "- Record reviewer identity, repository commit, evidence collection time, method, redacted evidence location and review outcome in an access-controlled review system.",
    "- Do not commit secrets, tokens, service-account key material, unredacted billing details or sensitive screenshots to a public repository.",
    "- Require separate formal authorisation before provisioning; this packet provides no approval pathway or deployment credentials.",
    "- STG-01 and STG-05–STG-07 remain outstanding and unchanged."
  );

  if (packet.errors.length) {
    out.push(
      "",
      "### Integrity errors",
      ...packet.errors.map(e => `- ${safe(e)}`)
    );
  }

  return `${out.join("\n")}\n`;
}

function main() {
  try {
    const read = name =>
      JSON.parse(readFileSync(new URL(name, import.meta.url), "utf8"));

    const packet = compileReviewerPacket(
      read("staging-evidence-register.json"),
      read("staging-evidence-submissions.json"),
      read("staging-observations.json")
    );

    const report = renderReviewerPacket(packet);

    process.stdout.write(report);

    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, report, "utf8");
    }

    if (!packet.integrityPassed) {
      process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(
      `PAY54 Phase 2G-W failed closed: ${error.message}\n`
    );
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
