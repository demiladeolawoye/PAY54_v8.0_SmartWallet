
"use strict";

/* PAY54 ENTERPRISE — Phase 2G-N read-only staging release readiness audit.
   This script verifies repository source controls. It does not authenticate
   to a cloud provider, provision resources or authorise a deployment. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const load = (relative) => {
  const path = resolve(root, relative);
  return existsSync(path) ? readFileSync(path, "utf8") : null;
};

const terraform = load("infrastructure/staging/main.tf");
const infraWorkflow = load(
  ".github/workflows/pay54-staging-infrastructure-tests.yml"
);
const stagingWorkflow = load(
  ".github/workflows/pay54-staging-deploy.yml"
);
const regression = load("backend/tests/staging-infrastructure.test.mjs");
const rows = [];

function record(label, status, detail) {
  rows.push({ label, status, detail });
}

function verify(label, condition, passed, failed) {
  record(label, condition ? "PASS" : "FAIL", condition ? passed : failed);
}

function pending(label, detail) {
  record(label, "NOT_VERIFIED", detail);
}

function contains(source, pattern) {
  return typeof source === "string" && pattern.test(source);
}

function policyAudit() {
  verify(
    "Terraform staging source present",
    terraform !== null,
    "Staging Terraform source is available for assessment.",
    "Missing infrastructure/staging/main.tf."
  );

  verify(
    "Provisioning disabled by default",
    contains(
      terraform,
      /variable\s+"authorized_provisioning"\s*\{[\s\S]*?default\s*=\s*false[\s\S]*?\}/
    ) &&
      contains(terraform, /enabled\s*=\s*var\.authorized_provisioning/),
    "Provisioning has a false default and uses an explicit enablement gate.",
    "Default-disabled provisioning controls are missing."
  );

  verify(
    "London-only staging configuration",
    contains(terraform, /region\s*=\s*"europe-west2"/),
    "The declared staging region is europe-west2.",
    "The expected London region is absent."
  );

  verify(
    "Federation remains disabled",
    contains(
      terraform,
      /resource\s+"google_iam_workload_identity_pool_provider"\s+"github"\s*\{[\s\S]*?disabled\s*=\s*true/
    ),
    "The GitHub identity provider is declared disabled.",
    "The expected disabled GitHub identity provider is absent."
  );

  verify(
    "Private and authenticated staging service",
    contains(
      terraform,
      /ingress\s*=\s*"INGRESS_TRAFFIC_INTERNAL_ONLY"/
    ) &&
      contains(terraform, /invoker_iam_disabled\s*=\s*false/) &&
      !contains(
        terraform,
        /member\s*=\s*"(?:allUsers|allAuthenticatedUsers)"/
      ),
    "Cloud Run source specifies internal-only ingress and authenticated invocations.",
    "Private ingress, authentication, or public-member restrictions are not satisfied."
  );

  verify(
    "Restricted immutable GitHub identity",
    [
      "repository_id",
      "repository_owner_id",
      "workflow_ref",
      "environment",
      "event_name"
    ].every((claim) => terraform?.includes(`assertion.${claim}`)) &&
      terraform.includes("refs/heads/project-titan") &&
      terraform.includes("pay54-staging-deploy.yml"),
    "Terraform declares immutable IDs and intended workflow, event, environment and branch constraints.",
    "One or more required GitHub identity restrictions are missing."
  );

  verify(
    "Infrastructure CI remains non-provisioning",
    infraWorkflow !== null &&
      contains(
        infraWorkflow,
        /TF_VAR_authorized_provisioning:\s*["']?false/
      ) &&
      !contains(
        infraWorkflow,
        /^\s*(?:terraform\s+(?:apply|destroy)|gcloud\s+run\s+deploy)\b/m
      ),
    "Infrastructure CI explicitly disables provisioning and contains no direct apply/destroy/deploy command.",
    "Infrastructure CI is missing or includes unsafe provisioning instructions."
  );

  verify(
    "Infrastructure security regression suite present",
    regression !== null &&
      infraWorkflow?.includes(
        "backend/tests/staging-infrastructure.test.mjs"
      ),
    "The existing security regression suite is wired into infrastructure CI.",
    "The infrastructure regression test or its CI reference is missing."
  );

  verify(
    "Staging deployment preparation is non-deploying",
    stagingWorkflow !== null &&
      !contains(
        stagingWorkflow,
        /^\s*(?:terraform\s+(?:apply|destroy)|gcloud\s+run\s+deploy|docker\s+push)\b/m
      ) &&
      !contains(
        stagingWorkflow,
        /google-github-actions\/auth@/
      ),
    "A staging preparation workflow exists without direct deployment commands or Google Cloud authentication.",
    "The staging preparation workflow is missing or contains an active deployment/authentication step."
  );

  pending(
    "Independent release reviewer",
    "A different trusted reviewer and enforced self-review prevention have not been established by this offline audit."
  );

  pending(
    "Google Cloud project and billing",
    "Cloud project ownership, billing activation and immutable project identity require live verification."
  );

  pending(
    "Secret Manager access",
    "Secret storage, IAM scope, rotation and runtime access need independent cloud verification."
  );

  pending(
    "Budget and cost alerts",
    "Billing budget, notification recipients and tested alert delivery require evidence."
  );

  pending(
    "Private connectivity and egress",
    "Runtime reachability, outbound policy and service-to-service authorisation require deployment-environment evidence."
  );

  pending(
    "Signed container provenance",
    "Image existence, signature, digest and provenance verification have not been established."
  );

  pending(
    "Provisioning authorisation",
    "A separate, recorded approval and controlled change process are required before cloud provisioning."
  );
}

function escapeCell(value) {
  return String(value)
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ")
    .replaceAll("\r", " ");
}

function report() {
  const count = (status) =>
    rows.filter((row) => row.status === status).length;

  const summary = [
    "## PAY54 Phase 2G-N — Staging Release Readiness",
    "",
    "**Read-only repository audit. No cloud authentication, provisioning, container deployment or payment execution.**",
    "",
    `Results: ${count("PASS")} PASS · ${count("FAIL")} FAIL · ${count("NOT_VERIFIED")} NOT_VERIFIED`,
    "",
    "| Control | Status | Evidence / limitation |",
    "| --- | --- | --- |",
    ...rows.map(
      (row) =>
        `| ${escapeCell(row.label)} | ${row.status} | ${escapeCell(row.detail)} |`
    ),
    "",
    "**Release decision: BLOCKED.** This audit never grants deployment approval. All NOT_VERIFIED controls require separate evidence and authorisation.",
    ""
  ].join("\n");

  process.stdout.write(`${summary}\n`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `${summary}\n`,
      "utf8"
    );
  }

  return {
    pass: count("PASS"),
    fail: count("FAIL"),
    pending: count("NOT_VERIFIED")
  };
}

policyAudit();
const totals = report();

test("PAY54 staging source-policy audit contains no failed controls", () => {
  assert.equal(
    totals.fail,
    0,
    "Readiness source controls contain a failure"
  );
});

test(
  "PAY54 staging activation remains blocked pending independent verification",
  () => {
    assert.ok(
      totals.pending > 0,
      "Offline checks cannot authorise staging activation"
    );
  }
);
