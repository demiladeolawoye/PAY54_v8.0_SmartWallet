"use strict";

/* PAY54 Batch 01 / STG-05 — independent offline provisioning safeguards.
 * Source-only assurance; this module cannot grant deployment approval. */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SOURCE = new URL("../../infrastructure/staging/main.tf", import.meta.url);
const EXPECTED = Object.freeze([
  ["terraform_data", "provisioning_authorisation"],
  ["google_project_service", "required"],
  ["google_service_account", "deployer"],
  ["google_service_account", "runtime"],
  ["google_artifact_registry_repository", "images"],
  ["google_iam_workload_identity_pool", "github"],
  ["google_iam_workload_identity_pool_provider", "github"],
  ["google_service_account_iam_member", "github_impersonation"],
  ["google_artifact_registry_repository_iam_member", "deployer_image_reader"],
  ["google_compute_network", "staging"],
  ["google_compute_subnetwork", "staging"],
  ["google_compute_firewall", "egress_deny"],
  ["google_cloud_run_v2_service", "news_staging"],
  ["google_cloud_run_v2_service_iam_member", "deployer_service"],
  ["google_service_account_iam_member", "deployer_runtime_user"]
]);

function scrub(source) {
  return source.replace(/^\\s*(?:#|\\/\\/).*$/gm, "");
}
function section(source, type, name) {
  const header = new RegExp('\\b' + type + '\\s+"' + name + '"\\s*\\{', "g");
  const hits = [...source.matchAll(header)];
  if (hits.length !== 1) return null;
  const open = hits[0].index + hits[0][0].length - 1;
  let depth = 0, quoted = false, escaped = false;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') quoted = false;
    } else if (ch === '"') quoted = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return source.slice(open + 1, i);
  }
  return null;
}

export function assessStagingProvisioningSafeguards(source) {
  if (typeof source !== "string" || !source.trim() || Buffer.byteLength(source) > 1024 * 1024) {
    throw new TypeError("Staging Terraform source missing or oversized");
  }
  const sanitized = scrub(source);
  const resourcePattern = /\bresource\s+"([a-z_0-9]+)"\s+"([a-z_0-9]+)"\s*\{/g;
  const found = [...sanitized.matchAll(resourcePattern)].map(m => m[1] + "." + m[2]);
  const expected = EXPECTED.map(([type, name]) => type + "." + name);
  const findings = [];
  const check = (id, ok) => findings.push({ id, passed: Boolean(ok) });
  const defaults = sanitized.match(/variable\s+"authorized_provisioning"\s*\{[^}]*\}/g) ?? [];
  check("DEFAULT_OFF", defaults.length === 1 && /\bdefault\s*=\s*false\b/.test(defaults[0]));
  check("EXACT_RESOURCES", found.length === expected.length && found.every((id, i) => expected.includes(id) && found.indexOf(id) === i));
  check("ALL_GATED", EXPECTED.every(([type, name]) => {
    const block = section(sanitized, 'resource\\s+"' + type + '"', name);
    return block !== null && (type === "google_project_service"
      ? /\bfor_each\s*=\s*local\.enabled\s*\?\s*local\.required_apis\s*:\s*toset\(\[\]\)/.test(block)
      : /\bcount\s*=\s*local\.enabled\s*\?\s*1\s*:\s*0\b/.test(block));
  }));
  check("DECLARED_GATE", /\benabled\s*=\s*var\.authorized_provisioning\b/.test(sanitized));
  const cidr = sanitized.match(/variable\s+"staging_subnet_cidr"\s*\{[\s\S]*?(?=\n\})/g) ?? [];
  check("CIDR_UNSET", cidr.length === 1 && /\bdefault\s*=\s*null\b/.test(cidr[0]) && /\bnullable\s*=\s*true\b/.test(cidr[0]));
  const wif = section(sanitized, 'resource\\s+"google_iam_workload_identity_pool_provider"', "github");
  check("FEDERATION_DISABLED", wif !== null && /\bdisabled\s*=\s*true\b/.test(wif));
  const cloudRun = section(sanitized, 'resource\\s+"google_cloud_run_v2_service"', "news_staging");
  check("INGRESS_PRIVATE", cloudRun !== null && /\bingress\s*=\s*"INGRESS_TRAFFIC_INTERNAL_ONLY"/.test(cloudRun) && /\binvoker_iam_disabled\s*=\s*false/.test(cloudRun));
  check("ALL_VPC_TRAFFIC", cloudRun !== null && /\begress\s*=\s*"ALL_TRAFFIC"/.test(cloudRun));
  const firewall = section(sanitized, 'resource\\s+"google_compute_firewall"', "egress_deny");
  check("DENY_IPV4", firewall !== null && /\bdirection\s*=\s*"EGRESS"/.test(firewall) &&
    /\bdestination_ranges\s*=\s*\["0\.0\.0\.0\/0"\]/.test(firewall) &&
    /\bdeny\s*\{\s*protocol\s*=\s*"all"\s*\}/.test(firewall));
  check("NO_NAT", !/\bresource\s+"google_compute_router_nat"/.test(sanitized));
  const apis = sanitized.match(/\brequired_apis\s*=\s*toset\(\[([\s\S]*?)\]\)/);
  check("NO_COMPUTE_AUTO_ENABLE", apis !== null && !/compute\.googleapis\.com/.test(apis[1]));
  check("NO_PUBLIC_INVOCATION", !/\b(allUsers|allAuthenticatedUsers)\b/.test(sanitized));
  const passing = findings.every(f => f.passed);
  return Object.freeze({
    control: "STG-05", sourceOnly: true, passed: passing, findings,
    securityApproval: "NOT_VERIFIED", cloudProvisioning: "DISABLED",
    stagingRelease: "BLOCKED", financialExecution: "DISABLED"
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const report = assessStagingProvisioningSafeguards(readFileSync(SOURCE, "utf8"));
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    if (!report.passed) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(error.message + "\n");
    process.exitCode = 1;
  }
}
