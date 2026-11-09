
"use strict";

/*
 * PAY54 Enterprise — Phase 2G-Z
 * STG-05 Network Egress Threat Model
 * Version: 1.0.0
 *
 * Offline design validation only.
 * No Google Cloud requests.
 * No credentials.
 * No Terraform execution.
 * No deployment or financial execution.
 */

import {
  readFileSync,
  appendFileSync
} from "node:fs";

import {
  resolve,
  dirname
} from "node:path";

import {
  fileURLToPath
} from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");

const REQUIRED_THREATS = Object.freeze([
  "EG-01",
  "EG-02",
  "EG-03",
  "EG-04",
  "EG-05",
  "EG-06"
]);

const SAFE_VALUE = /^[\x20-\x7e]{1,500}$/;

function ensure(condition, message) {
  if (!condition) {
    throw new Error(
      `STG-05 fail-closed: ${message}`
    );
  }
}

function checkText(value, path) {
  ensure(
    typeof value === "string" &&
    SAFE_VALUE.test(value) &&
    !/[<>|]/.test(value),
    `${path} invalid`
  );
}

export function assessEgressThreatModel(
  model,
  terraform
) {
  ensure(
    model &&
    typeof model === "object" &&
    !Array.isArray(model),
    "model missing"
  );

  ensure(
    typeof terraform === "string" &&
    terraform.length > 0,
    "staging Terraform missing"
  );

  const requiredFields = {
    schemaVersion: "1.0.0",
    phase: "2G-Z",
    controlId: "STG-05",
    workload: "pay54-news-staging",
    region: "europe-west2",
    sourcePath: "infrastructure/staging/main.tf",
    evidenceClass: "USER_SUPPLIED_TERRAFORM_SOURCE",
    decision: "DESIGN_ONLY_NOT_APPROVED",
    destinationInventoryStatus: "NOT_ESTABLISHED",
    privateDatabaseRequired: "UNDETERMINED",
    networkArchitecture: "UNDECIDED"
  };

  for (const [key, expected] of Object.entries(
    requiredFields
  )) {
    ensure(
      model[key] === expected,
      `${key} must remain ${expected}`
    );
  }

  ensure(
    Array.isArray(model.externalDestinations) &&
    model.externalDestinations.length === 0,
    "unverified external destinations must not be declared approved"
  );

  ensure(
    Array.isArray(model.threats) &&
    model.threats.length === REQUIRED_THREATS.length,
    "exactly six open threats are required"
  );

  ensure(
    model.threats.every((threat, i) => {
      if (
        !threat ||
        threat.id !== REQUIRED_THREATS[i] ||
        threat.status !== "OPEN"
      ) {
        return false;
      }

      for (const key of [
        "scenario",
        "trustBoundary",
        "currentEvidence",
        "requiredMitigation"
      ]) {
        checkText(
          threat[key],
          `${threat.id}.${key}`
        );
      }

      return true;
    }),
    "threat identifiers, ordering and statuses must remain open"
  );

  /*
   * The following assertions inspect source text only.
   *
   * They are not a Terraform parser and do not verify
   * actual Google Cloud runtime configuration.
   *
   * Source changes require additional review.
   */

  const checks = [
    [
      "PROVISIONING_DEFAULT_OFF",
      /variable\s+"authorized_provisioning"\s*\{[\s\S]*?default\s*=\s*false\b/.test(
        terraform
      )
    ],
    [
      "CONDITIONAL_RESOURCES",
      /enabled\s*=\s*var\.authorized_provisioning/.test(
        terraform
      ) &&
      /resource\s+"google_cloud_run_v2_service"\s+"news_staging"\s*\{\s*count\s*=\s*local\.enabled\s*\?\s*1\s*:\s*0/.test(
        terraform
      )
    ],
    [
      "INTERNAL_INGRESS_DECLARED",
      /ingress\s*=\s*"INGRESS_TRAFFIC_INTERNAL_ONLY"/.test(
        terraform
      )
    ],
    [
      "INVOKER_IAM_DECLARED",
      /invoker_iam_disabled\s*=\s*false/.test(
        terraform
      )
    ],
    [
      "FEDERATION_DECLARED_DISABLED",
      /resource\s+"google_iam_workload_identity_pool_provider"\s+"github"\s*\{[\s\S]*?disabled\s*=\s*true/.test(
        terraform
      )
    ],
    [
      "NO_EGRESS_ENFORCEMENT_CLAIM",
      !/vpc_access\s*\{[\s\S]*?egress\s*=\s*"ALL_TRAFFIC"/.test(
        terraform
      )
    ]
  ].map(([id, passed]) => ({
    id,
    result: passed
      ? "MATCHED_SOURCE"
      : "SOURCE_DRIFT_REVIEW_REQUIRED"
  }));

  ensure(
    checks.every(
      check => check.result === "MATCHED_SOURCE"
    ),
    `supplied source assumptions changed: ${
      checks
        .filter(
          check =>
            check.result !== "MATCHED_SOURCE"
        )
        .map(check => check.id)
        .join(", ")
    }`
  );

  return Object.freeze({
    phase: "2G-Z",
    control: "STG-05",
    sourceAssumptions: "MATCHED_SOURCE",
    outboundEnforcement: "NOT_VERIFIED",
    approvedDestinations: 0,
    threats: model.threats,
    checks,
    independentApprovals: 0,
    authenticatedCloudEvidence: 0,
    securityApproval: "NOT_VERIFIED",
    stagingRelease: "BLOCKED",
    cloudProvisioning: "DISABLED",
    financialExecution: "DISABLED"
  });
}

function clean(value) {
  return String(value)
    .replace(/[\r\n|<>]/g, " ")
    .slice(0, 500);
}

export function renderEgressThreatModel(report) {
  const lines = [
    "## PAY54 Phase 2G-Z — STG-05 Network Egress Threat Model",
    "",
    "**OFFLINE DESIGN / SOURCE CHECK — NOT CLOUD ATTESTATION OR DEPLOYMENT APPROVAL**",
    "",
    `Source assumptions: **${report.sourceAssumptions}**`,
    "Outbound enforcement: **NOT_VERIFIED**",
    "Approved external destinations: **0**",
    "Independent approvals: **0**",
    "Authenticated cloud evidence: **0**",
    "STG-05 security approval: **NOT_VERIFIED**",
    "Staging release: **BLOCKED**",
    "Cloud provisioning: **DISABLED**",
    "Financial execution: **DISABLED**",
    "",
    "### Source assumptions",
    "",
    "| Source assertion | Result |",
    "| --- | --- |",
    ...report.checks.map(
      check =>
        `| ${clean(check.id)} | ${clean(check.result)} |`
    ),
    "",
    "### Open threat register",
    "",
    "| ID | Threat scenario | Trust boundary | Current evidence | Required mitigation | Status |",
    "| --- | --- | --- | --- | --- | --- |",
    ...report.threats.map(
      threat =>
        `| ${clean(threat.id)} | ` +
        `${clean(threat.scenario)} | ` +
        `${clean(threat.trustBoundary)} | ` +
        `${clean(threat.currentEvidence)} | ` +
        `${clean(threat.requiredMitigation)} | ` +
        `${clean(threat.status)} |`
    ),
    "",
    "### Pending CTO/reviewer design decisions",
    "",
    "- [ ] Identify the staging news providers and required external hostnames, ports, protocols and credentials handling.",
    "- [ ] Confirm whether the staging news workload requires a database or any third-party data transfers.",
    "- [ ] Select and cost an outbound enforcement architecture; Cloud Run internal ingress alone does not constrain egress.",
    "- [ ] Define allowable outbound destinations, DNS/TLS controls, network logs and deny-by-default tests.",
    "- [ ] Require independent reviewer evidence and separate release authorisation before infrastructure changes.",
    "",
    "The workflow does not run Terraform, connect to Google Cloud, approve a provider or deploy infrastructure."
  ];

  return lines.join("\n") + "\n";
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) ===
    fileURLToPath(import.meta.url)
) {
  try {
    const model = JSON.parse(
      readFileSync(
        resolve(
          HERE,
          "staging-egress-threat-model.json"
        ),
        "utf8"
      )
    );

    const terraform = readFileSync(
      resolve(ROOT, model.sourcePath),
      "utf8"
    );

    const summary = renderEgressThreatModel(
      assessEgressThreatModel(
        model,
        terraform
      )
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
