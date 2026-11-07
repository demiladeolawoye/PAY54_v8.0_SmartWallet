
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — STG-04 CLOUD SECURITY READINESS AUDIT
   File: backend/security/staging-cloud-readiness.mjs
   Version: 1.0.0

   Offline source inspection only. No SDK, cloud authentication, network
   calls, state mutation, provisioning, secrets or deployment.
   ========================================================================== */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const POLICY_URL = new URL(
  "./staging-secret-policy.mjs",
  import.meta.url
);

const TERRAFORM_URL = new URL(
  "../../infrastructure/staging/main.tf",
  import.meta.url
);

const PASS = "PASS";
const NOT_VERIFIED = "NOT_VERIFIED";
const FAIL = "FAIL";

function control(id, name, result, evidence) {
  return Object.freeze({ id, name, result, evidence });
}

function includesAll(source, expressions) {
  return expressions.every(
    (expression) => expression.test(source)
  );
}

export function auditStagingCloudReadiness({
  policySource,
  terraformSource
}) {
  if (
    typeof policySource !== "string" ||
    typeof terraformSource !== "string"
  ) {
    throw new TypeError(
      "STG-04 requires policy and Terraform source strings."
    );
  }

  const checks = [
    control(
      "STG04-01",
      "Secret policy remains non-activating",
      includesAll(policySource, [
        /mode:\s*"POLICY_ONLY"/,
        /secretManagerApiEnabled:\s*false/,
        /provisioningAuthorized:\s*false/,
        /createSecrets:\s*false/,
        /issueCredentials:\s*false/,
        /financialExecutionEnabled:\s*false/,
        /identityProviderActivated:\s*false/
      ]) ? PASS : FAIL,
      "STG-03 source declares policy-only mode and disabled activation switches; runtime enforcement is not proven."
    ),

    control(
      "STG04-02",
      "Terraform provisioning is gated",
      includesAll(terraformSource, [
        /variable\s+"authorized_provisioning"\s*\{[\s\S]*?default\s*=\s*false/,
        /enabled\s*=\s*var\.authorized_provisioning/,
        /resource\s+"terraform_data"\s+"provisioning_authorisation"\s*\{\s*count\s*=\s*local\.enabled\s*\?\s*1\s*:\s*0/
      ]) ? PASS : FAIL,
      "Terraform source defaults to no provisioning and gates the authorisation resource."
    ),

    control(
      "STG04-03",
      "Terraform staging identity and ingress protections declared",
      includesAll(terraformSource, [
        /region\s*=\s*"europe-west2"/,
        /resource\s+"google_iam_workload_identity_pool_provider"\s+"github"\s*\{[\s\S]*?disabled\s*=\s*true/,
        /ingress\s*=\s*"INGRESS_TRAFFIC_INTERNAL_ONLY"/,
        /invoker_iam_disabled\s*=\s*false/
      ]) ? PASS : FAIL,
      "Source declares London region, disabled OIDC federation and authenticated internal ingress."
    ),

    control(
      "STG04-04",
      "Google Cloud project and billing linkage",
      NOT_VERIFIED,
      "User-provided console screenshots show project and billing linkage, but this CI job has no authenticated read-only cloud evidence."
    ),

    control(
      "STG04-05",
      "Monthly billing budget and notifications",
      NOT_VERIFIED,
      "User-provided screenshot shows a GBP 25 alert budget; scope and alert recipients are not independently authenticated by CI. Budget alerts are not hard spending caps."
    ),

    control(
      "STG04-06",
      "Secret Manager API enablement status",
      NOT_VERIFIED,
      "A source-level false flag is not a live check of whether secretmanager.googleapis.com is enabled."
    ),

    control(
      "STG04-07",
      "Existing secret inventory and IAM grants",
      NOT_VERIFIED,
      "Requires independently authorised read-only Google Cloud inventory and IAM evidence; do not retrieve secret payloads."
    ),

    control(
      "STG04-08",
      "Secret Manager Data Access audit logging",
      NOT_VERIFIED,
      "Requires checking IAM Audit Logs settings; Secret Manager AccessSecretVersion is a Data Access event, normally disabled by default."
    ),

    control(
      "STG04-09",
      "Runtime identity and key issuance",
      NOT_VERIFIED,
      "Live service-account identity, effective IAM inheritance and user-managed key inventory have not been independently checked."
    ),

    control(
      "STG04-10",
      "Secret replication, versions and rotation",
      NOT_VERIFIED,
      "Requires approved secret metadata and a rotation procedure; no secret values should be read into CI."
    ),

    control(
      "STG04-11",
      "Independent security reviewer and release authorisation",
      NOT_VERIFIED,
      "A separate authenticated reviewer and formal evidence-based approval are still required."
    )
  ];

  const totals = Object.freeze({
    PASS: checks.filter(
      (entry) => entry.result === PASS
    ).length,
    FAIL: checks.filter(
      (entry) => entry.result === FAIL
    ).length,
    NOT_VERIFIED: checks.filter(
      (entry) => entry.result === NOT_VERIFIED
    ).length
  });

  return Object.freeze({
    phase: "STG-04",
    scope: "OFFLINE_SOURCE_AUDIT",
    projectId: "pay54-staging-uk-01",
    stagingRelease: "BLOCKED",
    cloudProvisioning: "DISABLED",
    financialExecution: "DISABLED",
    totals,
    controls: Object.freeze(checks)
  });
}

export function renderStagingCloudReadinessMarkdown(
  report
) {
  const escapeCell = (value) => String(value)
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");

  const lines = [
    "## PAY54 STG-04 — Cloud Security Readiness",
    "",
    "**OFFLINE SOURCE AUDIT — NOT CLOUD ATTESTATION OR DEPLOYMENT APPROVAL**",
    "",
    `Results: ${report.totals.PASS} PASS · ${report.totals.FAIL} FAIL · ${report.totals.NOT_VERIFIED} NOT_VERIFIED`,
    "",
    "| Control | Status | Evidence / limitation |",
    "| --- | --- | --- |",
    ...report.controls.map(
      (entry) =>
        `| ${escapeCell(entry.id)} — ${escapeCell(entry.name)} | ${entry.result} | ${escapeCell(entry.evidence)} |`
    ),
    "",
    "**Staging release: BLOCKED. Cloud provisioning: DISABLED. Financial execution: DISABLED.**",
    "",
    "A green CI run only validates the offline audit program. It does not verify live Google Cloud configuration."
  ];

  return lines.join("\n") + "\n";
}

export function loadStagingCloudReadinessSources() {
  return {
    policySource: readFileSync(
      POLICY_URL,
      "utf8"
    ),
    terraformSource: readFileSync(
      TERRAFORM_URL,
      "utf8"
    )
  };
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1]
) {
  const report = auditStagingCloudReadiness(
    loadStagingCloudReadinessSources()
  );

  process.stdout.write(
    renderStagingCloudReadinessMarkdown(report)
  );

  if (report.totals.FAIL > 0) {
    process.exitCode = 1;
  }
}
