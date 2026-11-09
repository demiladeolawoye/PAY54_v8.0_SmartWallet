
"use strict";

/* PAY54 Phase 2G-X / STG-05 — offline Terraform networking inventory.
   Read only. No Terraform init/plan/apply, cloud credentials or deployment.
   Terraform inspection is advisory: neither textual matches nor absent
   declarations establish effective network policy or approval. */

import { readFileSync, readdirSync, lstatSync, appendFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const MAX_FILES = 500;
const MAX_BYTES = 1024 * 1024;
const SKIP_DIRS = new Set([".git", "node_modules", ".terraform", "dist", "build", "coverage", "vendor"]);
const STAGING_DIR_CANDIDATES = Object.freeze([
  "terraform/staging", "infrastructure/terraform/staging",
  "infra/terraform/staging", "infrastructure/staging", "infra/staging"
]);
const REQUIREMENTS = Object.freeze([
  { id: "INGRESS", label: "Authenticated internal ingress, no unauthorised public endpoint", evidence: ["google_cloud_run_v2_service", "google_cloud_run_service", "google_compute_firewall", "google_compute_backend_service"] },
  { id: "PRIVATE_DATA", label: "Private database / private service access", evidence: ["google_sql_database_instance", "google_service_networking_connection", "google_compute_global_address", "google_compute_network"] },
  { id: "EGRESS", label: "Explicit authorised outbound destinations and controlled routing", evidence: ["google_compute_router_nat", "google_compute_firewall", "google_network_security_firewall_endpoint", "google_cloud_run_v2_service"] },
  { id: "DNS_TLS", label: "DNS, transport encryption and certificate controls", evidence: ["google_dns_managed_zone", "google_compute_managed_ssl_certificate", "google_certificate_manager_certificate", "google_compute_ssl_policy"] },
  { id: "AUTH", label: "Application and network identity boundaries", evidence: ["google_cloud_run_service_iam", "google_cloud_run_v2_service_iam", "google_service_account", "google_compute_firewall"] },
  { id: "TESTS", label: "Independent ingress/egress tests and deny evidence", evidence: [] }
]);

function isInside(root, candidate) {
  const rel = relative(root, candidate);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !rel.startsWith(sep));
}
function listTerraformFiles(root) {
  const found = [];
  const warnings = [];
  for (const dirName of STAGING_DIR_CANDIDATES) {
    const start = resolve(root, dirName);
    if (!isInside(root, start)) continue;
    let info;
    try { info = lstatSync(start); } catch { continue; }
    if (!info.isDirectory() || info.isSymbolicLink()) { warnings.push(`Skipped non-directory or symlink: ${dirName}`); continue; }
    const stack = [start];
    while (stack.length) {
      const dir = stack.pop();
      let entries;
      try { entries = readdirSync(dir, { withFileTypes: true }); }
      catch { warnings.push(`Unreadable directory: ${relative(root, dir)}`); continue; }
      for (const entry of entries) {
        const path = resolve(dir, entry.name);
        if (!isInside(start, path) || entry.isSymbolicLink()) continue;
        if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) stack.push(path);
        else if (entry.isFile() && /\.tf(?:\.json)?$/i.test(entry.name)) {
          if (found.length >= MAX_FILES) { warnings.push("Terraform file enumeration limit exceeded"); return { files: found, warnings }; }
          found.push(path);
        }
      }
    }
  }
  return { files: [...new Set(found)].sort(), warnings };
}
function sourceSignals(files, root) {
  const resources = new Set();
  const warnings = [];
  let inspected = 0;
  for (const path of files) {
    try {
      const stat = lstatSync(path);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_BYTES) {
        warnings.push(`Uninspected file (size/type): ${relative(root, path)}`); continue;
      }
      const data = readFileSync(path, "utf8");
      // Inventory resource TYPE mentions only; do not extract attributes,
      // interpolate values, or claim whether rules are correctly enforced.
      for (const match of data.matchAll(/\bresource\s+"(google_[A-Za-z0-9_]+)"\s+"[A-Za-z0-9_-]+"/g)) {
        resources.add(match[1]);
      }
      inspected++;
    } catch { warnings.push(`Failed to inspect: ${relative(root, path)}`); }
  }
  return { resources, warnings, inspected };
}
export function assessNetworkSource(root = ROOT) {
  const repo = resolve(root);
  const { files, warnings: listWarnings } = listTerraformFiles(repo);
  const { resources, warnings: readWarnings, inspected } = sourceSignals(files, repo);
  const inventory = REQUIREMENTS.map(req => {
    const matches = req.evidence.filter(type => resources.has(type));
    return {
      id: req.id, requirement: req.label, status: "NOT_VERIFIED",
      resourceTypeSignals: matches,
      explanation: matches.length
        ? "Terraform resource declarations observed; attributes, effective controls and runtime enforcement NOT verified."
        : "No matching resource declaration observed in inspected staging paths; may exist elsewhere or be supplied by modules."
    };
  });
  return {
    phase: "2G-X", control: "STG-05", sourceAudit: inspected > 0 ? "SOURCE_INVENTORY_ONLY" : "NO_STAGING_TERRAFORM_INSPECTED",
    inspectedFiles: inspected, locatedFiles: files.map(p => relative(repo, p).split(sep).join("/")),
    warnings: [...listWarnings, ...readWarnings], checks: inventory,
    controlStatus: "NOT_VERIFIED", authenticatedCloudEvidence: 0,
    independentApprovals: 0, release: "BLOCKED", provisioningAuthorized: false,
    deploymentAuthorized: false, financialExecutionAuthorized: false
  };
}
function clean(s) { return String(s).replace(/[\r\n|<>]/g, " ").slice(0, 200); }
export function renderNetworkSummary(report) {
  const lines = [
    "## PAY54 Phase 2G-X — STG-05 Private Networking & Egress Source Inventory", "",
    "**READ-ONLY SOURCE INVENTORY — NOT A TERRAFORM PLAN, CLOUD ATTESTATION OR RELEASE APPROVAL**", "",
    `Source audit: **${report.sourceAudit}**`,
    `Staging Terraform files inspected: **${report.inspectedFiles}**`,
    `STG-05 status: **${report.controlStatus}**`,
    "Authenticated cloud evidence: **0**", "Independent approvals: **0**",
    "Staging release: **BLOCKED**", "Cloud provisioning: **DISABLED**", "Financial execution: **DISABLED**", "",
    "| Topic | Assessment | Declared resource type signals |", "| --- | --- | --- |",
    ...report.checks.map(c => `| ${clean(c.requirement)} | ${c.status} | ${c.resourceTypeSignals.map(clean).join(", ") || "None in inspected paths"} |`),
    "", "### Reviewer verification still required", "",
    "- [ ] Confirm approved VPC/subnet topology, region, private data connectivity and service identities.",
    "- [ ] Confirm the deployed application cannot be accessed without authorised authentication.",
    "- [ ] Verify explicit public-ingress exposure and firewall configurations with effective Google Cloud IAM and network evidence.",
    "- [ ] Verify outbound routing, DNS/TLS controls and destination restrictions using independently witnessed negative tests.",
    "- [ ] Verify database connectivity remains private and credential handling stays outside the repository.",
    "- [ ] Obtain an authenticated, independently reviewed Terraform plan and runtime observations before staging authorisation.",
    "", "A Terraform resource declaration does not prove a secure setting. Missing resource types do not prove absence of an infrastructure control.",
    "This job cannot modify Google Cloud resources or satisfy STG-05 approval."
  ];
  if (report.locatedFiles.length) lines.push("", "### Inspected files", ...report.locatedFiles.map(x => `- \`${clean(x)}\``));
  if (report.warnings.length) lines.push("", "### Inventory limitations", ...report.warnings.map(x => `- ${clean(x)}`));
  return lines.join("\n") + "\n";
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = assessNetworkSource();
    const markdown = renderNetworkSummary(report);
    process.stdout.write(markdown);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
    if (report.warnings.length) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`STG-05 source audit failed closed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
