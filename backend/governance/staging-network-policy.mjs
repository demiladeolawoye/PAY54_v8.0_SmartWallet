
"use strict";

/* PAY54 Phase 2G-Y / STG-05 — offline staging Terraform source policy.
   This tool does not authenticate to Google Cloud, run Terraform, or approve release.
   PASS_SOURCE means a source assertion matched; it is not runtime attestation. */

import { readFileSync, appendFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "../../infrastructure/staging/main.tf");
const MAX_SOURCE_BYTES = 1024 * 1024;
const RESOURCE_TYPES = Object.freeze([
  "terraform_data.provisioning_authorisation",
  "google_project_service.required",
  "google_service_account.deployer",
  "google_service_account.runtime",
  "google_artifact_registry_repository.images",
  "google_iam_workload_identity_pool.github",
  "google_iam_workload_identity_pool_provider.github",
  "google_service_account_iam_member.github_impersonation",
  "google_artifact_registry_repository_iam_member.deployer_image_reader",
  "google_cloud_run_v2_service.news_staging",
  "google_cloud_run_v2_service_iam_member.deployer_service",
  "google_service_account_iam_member.deployer_runtime_user"
]);

// STG-05 network declarations are permitted only as a complete, reviewed set.
// All existing project-titan resource addresses remain authoritative.
const NETWORK_RESOURCE_TYPES = Object.freeze([
  "google_compute_network.staging",
  "google_compute_subnetwork.staging",
  "google_compute_firewall.egress_deny"
]);

function containsAll(source, patterns) {
  return patterns.every(pattern => pattern.test(source ?? ""));
}

function hasRequiredNetworkSafety(source, resourceBlockFn, cloudRun, variableFn) {
  const network = resourceBlockFn("google_compute_network.staging");
  const subnet = resourceBlockFn("google_compute_subnetwork.staging");
  const firewall = resourceBlockFn("google_compute_firewall.egress_deny");
  const cidr = variableFn("staging_subnet_cidr");
  const access = cloudRun && block(cloudRun, "vpc_access", null);
  const networkInterfaces = access && block(access, "network_interfaces", null);

  return containsAll(network, [
    /\bcount\s*=\s*local\.enabled\s*\?\s*1\s*:\s*0\b/,
    /\bauto_create_subnetworks\s*=\s*false\b/,
    /\bproject\s*=\s*var\.project_id\b/
  ]) && containsAll(subnet, [
    /\bcount\s*=\s*local\.enabled\s*\?\s*1\s*:\s*0\b/,
    /\bregion\s*=\s*local\.region\b/,
    /\bnetwork\s*=\s*google_compute_network\.staging\[0\]\.id\b/,
    /\bip_cidr_range\s*=\s*var\.staging_subnet_cidr\b/
  ]) && containsAll(cidr, [
    /\bdefault\s*=\s*null\b/,
    /\bnullable\s*=\s*true\b/
  ]) && containsAll(firewall, [
    /\bcount\s*=\s*local\.enabled\s*\?\s*1\s*:\s*0\b/,
    /\bdirection\s*=\s*"EGRESS"/,
    /\bnetwork\s*=\s*google_compute_network\.staging\[0\]\.name\b/,
    /\bdestination_ranges\s*=\s*\["0\.0\.0\.0\/0"\]/,
    /\btarget_tags\s*=\s*\["pay54-staging-egress"\]/,
    /\bdeny\s*\{\s*protocol\s*=\s*"all"\s*\}/
  ]) && containsAll(access, [
    /\begress\s*=\s*"ALL_TRAFFIC"/
  ]) && containsAll(networkInterfaces, [
    /\bnetwork\s*=\s*google_compute_network\.staging\[0\]\.id\b/,
    /\bsubnetwork\s*=\s*google_compute_subnetwork\.staging\[0\]\.id\b/,
    /\btags\s*=\s*\["pay54-staging-egress"\]/
  ]);
}

function stripComments(source) {
  // Only strips # and // comments outside strings. Terraform heredocs are not
  // supported by this source gate; unexpected constructs require manual review.
  let out = "", quoted = false, escape = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i], next = source[i + 1];
    if (quoted) {
      out += c;
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') { quoted = true; out += c; }
    else if (c === "#" || (c === "/" && next === "/")) {
      while (i < source.length && source[i] !== "\n") i++;
      out += "\n";
    } else if (c === "/" && next === "*") {
      i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) i++;
      i++;
      out += " ";
    } else out += c;
  }
  if (quoted) throw new Error("Unterminated quoted string in Terraform source");
  return out;
}

function block(source, type, name) {
  const prefix = name === null
    ? new RegExp(`\\b${type}\\s*\\{`, "g")
    : new RegExp(`\\b${type}\\s+"${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s*\\{`, "g");
  const hits = [...source.matchAll(prefix)];
  if (hits.length !== 1) return null;
  const openAt = hits[0].index + hits[0][0].length - 1;
  let depth = 0, quoted = false, escaped = false;
  for (let i = openAt; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return source.slice(openAt + 1, i);
  }
  return null;
}

function resourceBlock(source, id) {
  const dot = id.indexOf(".");
  const type = id.slice(0, dot), name = id.slice(dot + 1);
  const pattern = new RegExp(`\\bresource\\s+"${type}"\\s+"${name}"\\s*\\{`, "g");
  const hits = [...source.matchAll(pattern)];
  if (hits.length !== 1) return null;
  // Use the shared balanced-block parser on a synthetic block name to avoid
  // matching nested resource-like prose elsewhere in this file.
  return block(source, `resource\\s+"${type}"`, name);
}

const truth = (source, pattern) => pattern.test(source ?? "");

export function assessStagingNetworkPolicy(original) {
  if (typeof original !== "string" || !original.trim() || Buffer.byteLength(original) > MAX_SOURCE_BYTES) {
    throw new Error("Missing or oversized staging Terraform source");
  }
  const source = stripComments(original);
  const findings = [];
  const check = (id, title, passed, detail) => findings.push({
    id, title, status: passed ? "PASS_SOURCE" : "FAIL_SOURCE", detail
  });
  const variable = n => block(source, "variable", n);
  const cloudRun = resourceBlock(source, "google_cloud_run_v2_service.news_staging");
  const wifProvider = resourceBlock(source, "google_iam_workload_identity_pool_provider.github");
  const auth = resourceBlock(source, "terraform_data.provisioning_authorisation");
  const local = block(source, "locals", null);

  check("DEFAULT_OFF", "Provisioning defaults off",
    truth(variable("authorized_provisioning"), /\bdefault\s*=\s*false\b/) &&
    truth(local, /\benabled\s*=\s*var\.authorized_provisioning\b/),
    "Explicit false default and local gate must remain present.");

  const resourceSet = [...RESOURCE_TYPES, ...NETWORK_RESOURCE_TYPES];
  const unguarded = resourceSet.filter(id => (RESOURCE_TYPES.includes(id) || resourceBlock(source, id) !== null) && !truth(resourceBlock(source, id), /\b(?:count\s*=\s*local\.enabled\s*\?\s*1\s*:\s*0|for_each\s*=\s*local\.enabled\s*\?\s*local\.required_apis\s*:\s*toset\(\[\]\))/));
  check("GATED_RESOURCES", "All expected resources are gated", unguarded.length === 0,
    unguarded.length ? `Missing or unguarded: ${unguarded.join(", ")}` : "All known resources are conditional on the provisioning gate.");

  const declarations = [...source.matchAll(/\bresource\s+"([a-zA-Z0-9_]+)"\s+"([a-zA-Z0-9_]+)"\s*\{/g)]
    .map(m => `${m[1]}.${m[2]}`);
  const declared = new Set(declarations);
  const networkCount = NETWORK_RESOURCE_TYPES.filter(id => declared.has(id)).length;
  const networkComplete = networkCount === NETWORK_RESOURCE_TYPES.length;
  const baselineComplete = RESOURCE_TYPES.every(id => declared.has(id));
  const unexpected = declarations.filter(id => !resourceSet.includes(id));
  const duplicates = declarations.filter((id, i) => declarations.indexOf(id) !== i);
  check("RESOURCE_INVENTORY", "Only reviewed, complete infrastructure resources are permitted",
    unexpected.length === 0 && duplicates.length === 0 && baselineComplete &&
    (networkCount === 0 || networkComplete) &&
    declarations.length === RESOURCE_TYPES.length + networkCount,
    `Declared resources: ${declarations.length}; network resources: ${networkCount}; unexpected: ${unexpected.join(", ") || "none"}; duplicates: ${duplicates.join(", ") || "none"}.`);

  // Existing legacy Terraform may remain unchanged during the design checkpoint.
  // After networking begins, all three declarations and their controls are mandatory.
  if (networkCount > 0) {
    check("NETWORK_FOUNDATION", "Dedicated staging network is complete and fail-closed",
      networkComplete &&
      hasRequiredNetworkSafety(source, id => resourceBlock(source, id), cloudRun, variable),
      "Dedicated VPC, subnet, outbound deny and Cloud Run ALL_TRAFFIC/tag attachment must agree.");
  } else {
    findings.push({
      id: "NETWORK_FOUNDATION", title: "Dedicated staging network implementation",
      status: "NOT_IMPLEMENTED",
      detail: "No Terraform network resources declared; STG-05 remains blocked."
    });
  }

  check("AUTH_INPUTS", "Provisioning requires verified inputs and image digest",
    truth(auth, /var\.project_id\s*!=\s*null/) &&
    truth(auth, /var\.project_number\s*!=\s*null/) &&
    truth(auth, /var\.github_repository_id\s*!=\s*null/) &&
    truth(auth, /var\.github_owner_id\s*!=\s*null/) &&
    truth(auth, /var\.container_image\s*!=\s*null/) &&
    truth(auth, /europe-west2-docker/) && truth(auth, /@sha256:/),
    "Source checks only; no image signature, provenance or approval is authenticated.");

  check("INTERNAL_INGRESS", "Cloud Run ingress remains internal only",
    truth(cloudRun, /\bingress\s*=\s*"INGRESS_TRAFFIC_INTERNAL_ONLY"/) &&
    truth(cloudRun, /\binvoker_iam_disabled\s*=\s*false\b/) &&
    truth(cloudRun, /\bdeletion_protection\s*=\s*true\b/) &&
    !truth(cloudRun, /\ballUsers\b|\ballAuthenticatedUsers\b/),
    "Cloud Run must declare internal ingress, IAM enforcement and deletion protection.");

  check("LONDON_REGION", "Cloud Run uses London staging region",
    truth(block(source, "provider", "google"), /\bregion\s*=\s*"europe-west2"/) &&
    truth(local, /\bregion\s*=\s*"europe-west2"/),
    "Static region declaration only.");

  check("RUNTIME_IDENTITY", "Cloud Run uses dedicated runtime identity",
    truth(cloudRun, /service_account\s*=\s*google_service_account\.runtime\[0\]\.email/) &&
    truth(resourceBlock(source, "google_service_account.runtime"), /account_id\s*=\s*"pay54-staging-runtime"/),
    "Effective roles and key policy are not assessed.");

  check("FEDERATION_OFF", "GitHub OIDC provider remains disabled",
    truth(wifProvider, /\bdisabled\s*=\s*true\b/),
    "This does not by itself prohibit all other cloud authentication methods.");

  const requiredClaims = ["repository_id", "repository_owner_id", "repository", "repository_owner", "ref", "environment", "event_name", "workflow_ref"];
  check("FEDERATION_CLAIMS", "GitHub trust policy retains required restrictions",
    requiredClaims.every(claim => truth(local, new RegExp(`assertion\\.${claim}\\s*==`))) &&
    truth(local, /workflow_dispatch/) && truth(local, /refs\/heads\/project-titan/),
    "Static token condition review only; reviewer must verify live federation later.");

  const publicRole = /(?:"|')roles\/run\.invoker(?:"|')/;
  check("NO_PUBLIC_INVOKER", "No public invoker declaration",
    !truth(source, /\b(?:allUsers|allAuthenticatedUsers)\b/) &&
    !truth(resourceBlock(source, "google_cloud_run_v2_service_iam_member.deployer_service"), publicRole),
    "Textual check only; effective IAM bindings remain unverified.");

  const explicitEgress = truth(cloudRun, /\bvpc_access\s*\{/) &&
    truth(cloudRun, /\begress\s*=\s*"ALL_TRAFFIC"/);
  findings.push({
    id: "CONTROLLED_EGRESS", title: "Outbound destinations and routing",
    status: "NOT_VERIFIED",
    detail: explicitEgress
      ? "A VPC all-traffic declaration is present, but route, firewall, NAT, DNS and destination-deny evidence remain unverified."
      : "No Cloud Run all-traffic VPC egress declaration found. Outbound access is not demonstrated as restricted."
  });

  findings.push({
    id: "PRIVATE_DATABASE", title: "Private database connectivity",
    status: "NOT_VERIFIED",
    detail: "No runtime private database connection is established by this audit. Confirm whether this workload requires one."
  });

  const sourceIntegrity = findings.some(f => f.status === "FAIL_SOURCE") ? "FAIL" : "PASS";
  return {
    phase: "2G-Y", control: "STG-05", sourceIntegrity,
    sourceOnly: true, findings,
    securityApproval: "NOT_VERIFIED", authenticatedEvidence: 0,
    independentApprovals: 0, stagingRelease: "BLOCKED",
    cloudProvisioning: "DISABLED", financialExecution: "DISABLED"
  };
}

function md(text) { return String(text).replace(/[\r\n|<>]/g, " ").slice(0, 600); }
export function renderStagingNetworkPolicy(report) {
  const lines = [
    "## PAY54 Phase 2G-Y — STG-05 Terraform Source Policy", "",
    "**OFFLINE STATIC INSPECTION — NOT CLOUD ATTESTATION OR RELEASE APPROVAL**", "",
    `Source policy integrity: **${report.sourceIntegrity}**`,
    "STG-05 security approval: **NOT_VERIFIED**",
    "Authenticated cloud evidence: **0**", "Independent approvals: **0**",
    "Staging release: **BLOCKED**", "Cloud provisioning: **DISABLED**", "Financial execution: **DISABLED**", "",
    "| Control | Source assessment | Finding |", "| --- | --- | --- |",
    ...report.findings.map(f => `| ${md(f.title)} | ${f.status} | ${md(f.detail)} |`), "",
    "### Reviewer work remaining", "",
    "- [ ] Review actual egress destination allowlist and VPC routing; run authorised negative outbound-access tests.",
    "- [ ] Verify effective IAM, Cloud Run ingress and service-account key restrictions in Google Cloud.",
    "- [ ] Confirm workload data-flow requirements, private database needs, and TLS/DNS controls.",
    "- [ ] Review signed image provenance, deployment approvals, authenticated cloud evidence and STG-01 independence.", "",
    "PASS_SOURCE signifies a source-text match only. The audit never performs Terraform init, plan, apply, API calls or deployment."
  ];
  return `${lines.join("\n")}\n`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const source = readFileSync(DEFAULT_PATH, "utf8");
    const report = assessStagingNetworkPolicy(source);
    const summary = renderStagingNetworkPolicy(report);
    process.stdout.write(summary);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary, "utf8");
    if (report.sourceIntegrity !== "PASS") process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`PAY54 STG-05 source policy failed closed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
