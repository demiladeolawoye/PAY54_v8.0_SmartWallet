
"use strict";

/* ============================================================================
   PAY54 ENTERPRISE — STAGING RELEASE GOVERNANCE AUDIT
   File: backend/tests/staging-release-governance.mjs
   Version: 1.0.0

   Read-only GitHub identity/environment verification.
   Does not provision infrastructure, approve releases or request OIDC tokens.
   ============================================================================ */

import { readFileSync, existsSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const expectedRepository = "demiladeolawoye/PAY54_v8.0_SmartWallet";
const expectedBranch = "refs/heads/project-titan";
const expectedEnvironment = "pay54-staging";
const token = process.env.GITHUB_TOKEN || "";
const currentRepository = process.env.GITHUB_REPOSITORY || "";
const currentRef = process.env.GITHUB_REF || "";
const results = [];

function record(control, status, detail) {
  results.push({ control, status, detail });
}

function checkedFile(relative) {
  const path = resolve(root, relative);
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

function sourceCheck(control, value, success, failure) {
  record(control, value ? "PASS" : "FAIL", value ? success : failure);
}

const infra = checkedFile("infrastructure/staging/main.tf");
const infraCi = checkedFile(".github/workflows/pay54-staging-infrastructure-tests.yml");
const releaseWorkflow = checkedFile(".github/workflows/pay54-staging-deploy.yml");

if (infra === null) {
  record("Staging Terraform source", "FAIL", "Required infrastructure/staging/main.tf is missing.");
} else {
  sourceCheck(
    "Provisioning remains disabled by default",
    /variable\s+"authorized_provisioning"\s*\{[^}]*default\s*=\s*false/s.test(infra),
    "Terraform provisioning defaults to false.",
    "Required explicit provisioning default is missing."
  );
  sourceCheck(
    "GitHub federation remains disabled",
    /resource\s+"google_iam_workload_identity_pool_provider"\s+"github"\s*\{[\s\S]*?disabled\s*=\s*true/.test(infra),
    "GitHub OIDC provider is declared disabled.",
    "Disabled OIDC provider requirement is missing."
  );
  sourceCheck(
    "Trusted staging branch and environment are declared",
    infra.includes(expectedBranch) && infra.includes(expectedEnvironment),
    "Terraform includes the intended branch and environment.",
    "Expected staging trust boundaries are missing."
  );
  sourceCheck(
    "Immutable GitHub IDs are checked",
    infra.includes("assertion.repository_id") && infra.includes("assertion.repository_owner_id"),
    "Trust condition uses numeric repository and owner claims.",
    "Repository or owner claim check is missing."
  );
}

if (infraCi === null) {
  record("Infrastructure test workflow", "FAIL", "Infrastructure security workflow is missing.");
} else {
  sourceCheck(
    "Infrastructure CI disables provisioning",
    /TF_VAR_authorized_provisioning:\s*["']?false["']?/.test(infraCi) &&
      !/^[ \t]*terraform\s+(?:apply|destroy)\b/m.test(infraCi),
    "Infrastructure CI runs with provisioning disabled; no apply/destroy step found.",
    "Infrastructure CI has an unsafe or missing provisioning boundary."
  );
}

record(
  "Staging deployment workflow",
  "NOT_VERIFIED",
  releaseWorkflow === null
    ? "pay54-staging-deploy.yml does not exist; no deployment-workflow approval is implied."
    : "Deployment workflow exists; its complete security design requires a separate review."
);

if (!currentRepository || !currentRef) {
  record("GitHub execution context", "NOT_VERIFIED", "Not running with GitHub Actions repository/ref context.");
} else {
  sourceCheck(
    "Expected repository and branch",
    currentRepository === expectedRepository && currentRef === expectedBranch,
    "Running in the approved repository and project-titan branch.",
    `Unexpected workflow context: ${currentRepository} @ ${currentRef}.`
  );
}

async function api(path) {
  if (!token) return { ok: false, reason: "Read-only GitHub token unavailable." };
  try {
    const response = await fetch(`https://api.github.com${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "PAY54-Staging-Readiness/1.0"
      },
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) return { ok: false, reason: `GitHub API returned HTTP ${response.status}; no protection inferred.` };
    return { ok: true, data: await response.json() };
  } catch (error) {
    return { ok: false, reason: `GitHub API request unavailable: ${error.name || "Error"}.` };
  }
}

if (currentRepository === expectedRepository && currentRef === expectedBranch && token) {
  const repo = await api(`/repos/${expectedRepository}`);
  if (!repo.ok) {
    record("Live immutable GitHub repository identity", "NOT_VERIFIED", repo.reason);
  } else {
    const id = repo.data?.id;
    const ownerId = repo.data?.owner?.id;
    const fullName = repo.data?.full_name;
    const verified = Number.isSafeInteger(id) && id > 0 &&
      Number.isSafeInteger(ownerId) && ownerId > 0 && fullName === expectedRepository;
    record(
      "Live immutable GitHub repository identity",
      verified ? "PASS" : "FAIL",
      verified ? `Repository ID ${id}; owner ID ${ownerId}. Compare with approved Terraform inputs before any provisioning.` :
        "Repository metadata did not match the expected identity."
    );
  }

  const environment = await api(`/repos/${expectedRepository}/environments/${expectedEnvironment}`);
  if (!environment.ok) {
    record("GitHub staging environment exists", "NOT_VERIFIED", environment.reason);
    record("Required reviewers and self-review protection", "NOT_VERIFIED", "Environment metadata inaccessible.");
    record("Staging branch deployment restriction", "NOT_VERIFIED", "Environment metadata inaccessible.");
  } else {
    const data = environment.data;
    record("GitHub staging environment exists", "PASS", "GitHub API returned the pay54-staging environment.");
    const reviewerRules = (data.protection_rules || []).filter(rule =>
      rule.type === "required_reviewers" && Array.isArray(rule.reviewers) && rule.reviewers.length > 0
    );
    const approvalConfigured = reviewerRules.length > 0 && data.prevent_self_review === true;
    record(
      "Required reviewers and self-review protection",
      approvalConfigured ? "PASS" : "NOT_VERIFIED",
      approvalConfigured ? "Required reviewer rule and prevention of self-review verified." :
        "Required reviewers and prevent_self_review=true were not both verifiable."
    );

    const policy = data.deployment_branch_policy;
    if (!policy) {
      record("Staging branch deployment restriction", "NOT_VERIFIED", "No environment deployment branch policy returned.");
    } else if (policy.protected_branches === true) {
      record("Staging branch deployment restriction", "NOT_VERIFIED", "Protected-branch mode exists; exact project-titan policy requires separate confirmation.");
    } else if (policy.custom_branch_policies === true) {
      const branchPolicies = await api(`/repos/${expectedRepository}/environments/${expectedEnvironment}/deployment-branch-policies?per_page=100`);
      const policies = branchPolicies.ok ? branchPolicies.data?.branch_policies : null;
      const exact = Array.isArray(policies) && policies.some(item => item.name === "project-titan" && item.type === "branch");
      const other = Array.isArray(policies) && policies.some(item => item.name !== "project-titan" || item.type !== "branch");
      record(
        "Staging branch deployment restriction",
        exact && !other ? "PASS" : "NOT_VERIFIED",
        exact && !other ? "Only the exact project-titan branch deployment rule was observed." :
          "Could not verify an exclusive project-titan branch policy."
      );
    } else {
      record("Staging branch deployment restriction", "NOT_VERIFIED", "Environment does not expose an approved restrictive branch policy.");
    }
  }
} else {
  for (const control of [
    "Live immutable GitHub repository identity",
    "GitHub staging environment exists",
    "Required reviewers and self-review protection",
    "Staging branch deployment restriction"
  ]) record(control, "NOT_VERIFIED", "Read-only GitHub API checks require an approved Actions push on project-titan.");
}

const counts = Object.fromEntries(["PASS", "FAIL", "NOT_VERIFIED"].map(status =>
  [status, results.filter(result => result.status === status).length]
));
const esc = value => String(value).replaceAll("|", "\\|").replaceAll("\n", " ").replaceAll("\r", " ");
const report = [
  "## PAY54 Phase 2G-L — Staging Deployment Identity and Approvals",
  "",
  "**Read-only audit. No deployment, credentials exchange, provisioning or financial execution.**",
  "",
  `Results: ${counts.PASS} PASS · ${counts.FAIL} FAIL · ${counts.NOT_VERIFIED} NOT_VERIFIED`,
  "",
  "| Control | Status | Evidence / limitation |",
  "|---|---|---|",
  ...results.map(item => `| ${esc(item.control)} | ${item.status} | ${esc(item.detail)} |`),
  "",
  "**NOT_VERIFIED does not constitute staging approval. No automatic deployment is authorised.**",
  ""
].join("\n");

console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
if (counts.FAIL > 0) process.exitCode = 1;
