
"use strict";

/*
 * PAY54 Phase 2G-AB / STG-05 — outbound destination inventory contract.
 * Offline validation only. No DNS lookups, HTTP requests, Terraform, cloud
 * credentials, provider activation, approval or financial execution.
 */

import { readFileSync, appendFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DIRECTORY = dirname(fileURLToPath(import.meta.url));
const INVENTORY_FILE = resolve(
  DIRECTORY,
  "staging-egress-destinations.json"
);

const MAX_JSON_BYTES = 128 * 1024;

const EXPECTED_DEPENDENCIES = Object.freeze([
  "DEP-01",
  "DEP-02",
  "DEP-03",
  "DEP-04",
  "DEP-05",
  "DEP-06"
]);

const REQUIRED_PROPOSAL_FIELDS = Object.freeze([
  "id",
  "providerName",
  "fqdn",
  "port",
  "protocol",
  "purpose",
  "dataClassification",
  "authenticationMode",
  "contractStatus",
  "businessOwner",
  "evidenceReference",
  "reviewStatus"
]);

function requireCondition(condition, message) {
  if (!condition) {
    throw new Error(
      `STG-05 inventory rejected: ${message}`
    );
  }
}

function plainObject(value) {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function exactKeys(value, keys, path) {
  requireCondition(
    plainObject(value),
    `${path} must be an object`
  );

  requireCondition(
    Object.keys(value).sort().join("\0") ===
      [...keys].sort().join("\0"),
    `${path} has missing or unexpected keys`
  );
}

function safeText(value, name, limit = 300) {
  requireCondition(
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= limit &&
    value === value.trim() &&
    !/[\u0000-\u001f\u007f<>|]/.test(value),
    `${name} must be nonempty, bounded, single-line plain text`
  );
}

function validFqdn(host) {
  if (
    typeof host !== "string" ||
    host.length > 253 ||
    host !== host.toLowerCase() ||
    host.endsWith(".") ||
    host.includes("*") ||
    host.includes(":") ||
    host.includes("/") ||
    !host.includes(".") ||
    /^\d+(?:\.\d+){3}$/.test(host)
  ) {
    return false;
  }

  const labels = host.split(".");

  if (
    labels.some(
      label =>
        !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)
    )
  ) {
    return false;
  }

  const ending = labels[labels.length - 1];

  return ![
    "localhost",
    "local",
    "internal",
    "test",
    "invalid",
    "example",
    "onion"
  ].includes(ending) &&
    !host.endsWith(".localhost") &&
    !host.endsWith(".local") &&
    !host.endsWith(".internal") &&
    !host.endsWith(".metadata.google.internal") &&
    host !== "metadata.google.internal";
}

export function assessStagingEgressInventory(inventory) {
  exactKeys(
    inventory,
    [
      "schemaVersion",
      "phase",
      "control",
      "projectId",
      "region",
      "workload",
      "evidenceClass",
      "inventoryStatus",
      "enforcementStatus",
      "defaultOutboundDecision",
      "approvedDestinations",
      "proposedDestinations",
      "unresolvedDependencies",
      "releaseApproval",
      "cloudProvisioning",
      "financialExecution"
    ],
    "inventory"
  );

  const fixed = {
    schemaVersion: "1.0.0",
    phase: "2G-AB",
    control: "STG-05",
    projectId: "pay54-staging-uk-01",
    region: "europe-west2",
    workload: "pay54-news-staging",
    evidenceClass: "DESIGN_ONLY_UNAUTHENTICATED",
    inventoryStatus: "NOT_ESTABLISHED",
    enforcementStatus: "NOT_IMPLEMENTED",
    defaultOutboundDecision: "DENY_PENDING_IMPLEMENTATION",
    releaseApproval: "BLOCKED",
    cloudProvisioning: "DISABLED",
    financialExecution: "DISABLED"
  };

  for (const [field, expected] of Object.entries(fixed)) {
    requireCondition(
      inventory[field] === expected,
      `${field} must equal ${expected}`
    );
  }

  requireCondition(
    Array.isArray(inventory.approvedDestinations) &&
      inventory.approvedDestinations.length === 0,
    "approved destinations must remain empty without independent evidence and authorisation"
  );

  requireCondition(
    Array.isArray(inventory.proposedDestinations),
    "proposedDestinations must be an array"
  );

  requireCondition(
    inventory.proposedDestinations.length <= 100,
    "too many proposals"
  );

  const ids = new Set();
  const hosts = new Set();

  for (const proposal of inventory.proposedDestinations) {
    exactKeys(
      proposal,
      REQUIRED_PROPOSAL_FIELDS,
      "destination proposal"
    );

    for (const field of REQUIRED_PROPOSAL_FIELDS) {
      if (field !== "port") {
        safeText(
          proposal[field],
          `proposal.${field}`
        );
      }
    }

    requireCondition(
      /^DEST-[0-9]{3,6}$/.test(proposal.id),
      "invalid proposal ID"
    );

    requireCondition(
      !ids.has(proposal.id),
      "duplicate proposal ID"
    );

    ids.add(proposal.id);

    requireCondition(
      validFqdn(proposal.fqdn),
      `unsafe or ambiguous FQDN: ${proposal.fqdn}`
    );

    requireCondition(
      proposal.protocol === "HTTPS" &&
        proposal.port === 443,
      "only HTTPS port 443 proposals are supported by this initial contract"
    );

    requireCondition(
      proposal.reviewStatus === "PENDING_REVIEW",
      "proposals cannot self-approve"
    );

    requireCondition(
      proposal.contractStatus === "UNVERIFIED",
      "contract approval requires separate evidence"
    );

    requireCondition(
      proposal.evidenceReference === "NOT_PROVIDED" ||
        /^DOC-[A-Z0-9-]{4,80}$/.test(
          proposal.evidenceReference
        ),
      "invalid evidence reference"
    );

    requireCondition(
      !hosts.has(proposal.fqdn),
      "duplicate FQDN proposal"
    );

    hosts.add(proposal.fqdn);
  }

  requireCondition(
    Array.isArray(inventory.unresolvedDependencies) &&
      inventory.unresolvedDependencies.length ===
        EXPECTED_DEPENDENCIES.length,
    "six unresolved dependency questions are mandatory"
  );

  for (
    const [index, dependency] of
    inventory.unresolvedDependencies.entries()
  ) {
    exactKeys(
      dependency,
      ["id", "category", "question"],
      "unresolved dependency"
    );

    requireCondition(
      dependency.id === EXPECTED_DEPENDENCIES[index],
      "dependency ID changed"
    );

    safeText(
      dependency.category,
      "dependency.category"
    );

    safeText(
      dependency.question,
      "dependency.question"
    );
  }

  return Object.freeze({
    phase: "2G-AB",
    control: "STG-05",
    inventoryIntegrity: "PASS",
    proposedDestinations:
      inventory.proposedDestinations.length,
    approvedDestinations: 0,
    unresolvedDependencies:
      EXPECTED_DEPENDENCIES.length,
    outboundEnforcement: "NOT_IMPLEMENTED",
    authenticatedCloudEvidence: 0,
    independentApprovals: 0,
    securityApproval: "NOT_VERIFIED",
    stagingRelease: "BLOCKED",
    cloudProvisioning: "DISABLED",
    financialExecution: "DISABLED"
  });
}

export function renderStagingEgressInventory(report) {
  return [
    "## PAY54 Phase 2G-AB — STG-05 Outbound Destination Inventory",
    "",
    "**OFFLINE CONTRACT CHECK — NOT LIVE NETWORK EVIDENCE OR APPROVAL**",
    "",
    `Inventory integrity: **${report.inventoryIntegrity}**`,
    `Proposed destinations: **${report.proposedDestinations}**`,
    "Approved destinations: **0**",
    `Unresolved dependency questions: **${report.unresolvedDependencies}**`,
    "Outbound enforcement: **NOT_IMPLEMENTED**",
    "Authenticated cloud evidence: **0**",
    "Independent approvals: **0**",
    "STG-05 approval: **NOT_VERIFIED**",
    "Staging release: **BLOCKED**",
    "Cloud provisioning: **DISABLED**",
    "Financial execution: **DISABLED**",
    "",
    "### Required before any destination can be approved",
    "",
    "- [ ] Confirm provider contract, business purpose, data classes and service ownership.",
    "- [ ] Independently verify FQDNs, redirects, TLS and DNS / SSRF protections.",
    "- [ ] Select a non-bypassable enforcement method and assess operating costs.",
    "- [ ] Record independently authenticated security evidence and negative connection tests.",
    "- [ ] Obtain separate STG-01 and STG-05 approvals and formal provisioning authorisation.",
    "",
    "This workflow cannot grant approval or change Terraform, Google Cloud, financial data or service configuration.",
    ""
  ].join("\n");
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) ===
    fileURLToPath(import.meta.url)
) {
  try {
    const content = readFileSync(
      INVENTORY_FILE,
      "utf8"
    );

    requireCondition(
      Buffer.byteLength(content) <= MAX_JSON_BYTES,
      "inventory file too large"
    );

    const report = assessStagingEgressInventory(
      JSON.parse(content)
    );

    const summary = renderStagingEgressInventory(
      report
    );

    process.stdout.write(summary);

    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        summary,
        "utf8"
      );
    }
  } catch (error) {
    process.stderr.write(
      `${error.message}\n`
    );

    process.exitCode = 1;
  }
}
