
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — STAGING INFRASTRUCTURE SECURITY REGRESSION
   File: backend/tests/staging-infrastructure.test.mjs
   Version: 1.0.0

   Static source-policy assertions.
   Terraform itself performs syntax and schema validation in CI.
   ========================================================================== */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL(
    "../../infrastructure/staging/main.tf",
    import.meta.url
  ),
  "utf8"
);

function requireSource(pattern, description) {
  assert.match(
    source,
    pattern,
    `Missing PAY54 security requirement: ${description}`
  );
}

test("provisioning is disabled by default", () => {
  requireSource(
    /variable\s+"authorized_provisioning"\s*\{[^}]*default\s*=\s*false/s,
    "disabled provisioning default"
  );

  requireSource(
    /enabled\s*=\s*var\.authorized_provisioning/,
    "explicit resource creation control"
  );
});

test("resource creation is conditional", () => {
  const resourceBlocks = [
    "google_service_account",
    "google_artifact_registry_repository",
    "google_iam_workload_identity_pool",
    "google_iam_workload_identity_pool_provider",
    "google_cloud_run_v2_service"
  ];

  for (const resource of resourceBlocks) {
    const pattern = new RegExp(
      `resource\\s+"${resource}"\\s+"[^"]+"\\s*\\{\\s*` +
      `count\\s*=\\s*local\\.enabled\\s*\\?\\s*1\\s*:\\s*0`
    );

    requireSource(
      pattern,
      `${resource} must be creation-gated`
    );
  }
});

test("PAY54 staging region is restricted to London", () => {
  requireSource(
    /region\s*=\s*"europe-west2"/,
    "approved regional deployment"
  );
});

test("Workload Identity Federation is initially disabled", () => {
  requireSource(
    /resource\s+"google_iam_workload_identity_pool_provider"\s+"github"\s*\{[\s\S]*?disabled\s*=\s*true/,
    "disabled external identity provider"
  );
});

test("GitHub identity uses immutable numeric identifiers", () => {
  for (const name of [
    "repository_id",
    "repository_owner_id"
  ]) {
    requireSource(
      new RegExp(`assertion\\.${name}\\s*==`),
      `${name} trust restriction`
    );
  }
});

test("GitHub staging trust checks the exact workflow", () => {
  requireSource(
    /pay54-staging-deploy[.]yml/,
    "approved deployment workflow identity"
  );

  requireSource(
    /assertion[.]workflow_ref/,
    "workflow reference verification"
  );

  requireSource(
    /assertion[.]event_name/,
    "manual deployment event verification"
  );
});

test("GitHub branch and environment are constrained", () => {
  requireSource(
    /refs\/heads\/project-titan/,
    "trusted branch"
  );

  requireSource(
    /pay54-staging/,
    "trusted environment"
  );

  requireSource(
    /assertion[.]environment/,
    "environment claim verification"
  );
});

test("Cloud Run allows internal ingress only", () => {
  requireSource(
    /ingress\s*=\s*"INGRESS_TRAFFIC_INTERNAL_ONLY"/,
    "private Cloud Run ingress"
  );

  assert.doesNotMatch(
    source,
    /ingress\s*=\s*"INGRESS_TRAFFIC_ALL"/
  );
});

test("Cloud Run requires authentication", () => {
  requireSource(
    /invoker_iam_disabled\s*=\s*false/,
    "Cloud Run IAM authentication"
  );

  assert.doesNotMatch(
    source,
    /member\s*=\s*"allUsers"/
  );

  assert.doesNotMatch(
    source,
    /member\s*=\s*"allAuthenticatedUsers"/
  );
});

test("Cloud Run is deletion protected and bounded", () => {
  requireSource(
    /deletion_protection\s*=\s*true/,
    "deletion protection"
  );

  requireSource(
    /min_instance_count\s*=\s*0/,
    "zero idle instances"
  );

  requireSource(
    /max_instance_count\s*=\s*1/,
    "staging capacity limitation"
  );
});

test("image requires an immutable SHA-256 digest", () => {
  requireSource(
    /@sha256:/,
    "digest-only image validation"
  );

  requireSource(
    /container_image/,
    "verified image input"
  );
});

test("runtime and deployer identities are separated", () => {
  requireSource(
    /account_id\s*=\s*"pay54-staging-deployer"/,
    "deployer identity"
  );

  requireSource(
    /account_id\s*=\s*"pay54-staging-runtime"/,
    "runtime identity"
  );

  requireSource(
    /service_account\s*=\s*google_service_account[.]runtime/,
    "runtime service-account binding"
  );
});

test("only approved scoped deployment roles appear", () => {
  for (const role of [
    "roles/iam.workloadIdentityUser",
    "roles/artifactregistry.reader",
    "roles/run.developer",
    "roles/iam.serviceAccountUser"
  ]) {
    assert.ok(
      source.includes(role),
      `Missing ${role}`
    );
  }

  for (const forbidden of [
    "roles/owner",
    "roles/editor",
    "roles/run.admin",
    "roles/artifactregistry.admin",
    "roles/iam.serviceAccountKeyAdmin"
  ]) {
    assert.equal(
      source.includes(forbidden),
      false,
      `Forbidden role present: ${forbidden}`
    );
  }
});

test("infrastructure requires explicit verified inputs", () => {
  for (const name of [
    "project_id",
    "project_number",
    "github_repository_id",
    "github_owner_id",
    "container_image"
  ]) {
    requireSource(
      new RegExp(`variable\\s+"${name}"`),
      `required verified input ${name}`
    );
  }

  requireSource(
    /terraform_data[.]provisioning_authorisation/,
    "provisioning authorisation dependency"
  );
});

test("IaC does not embed active payment capabilities", () => {
  for (const forbidden of [
    "PAY54_FINANCIAL_EXECUTION=true",
    "PAY54_NEWS_PROVIDER_ENABLED=true",
    "PAY54_PRODUCTION_MODE=true"
  ]) {
    assert.equal(
      source.includes(forbidden),
      false
    );
  }
});


/* STG-05 — Required but unset network addressing, unchanged cloud activation. */
test("staging subnet CIDR requires canonical private IPv4 and approved /24–/26 size", () => {
  requireSource(
    /variable\s+"staging_subnet_cidr"\s*\{[\s\S]*?\bdefault\s*=\s*null[\s\S]*?\bnullable\s*=\s*true/,
    "CIDR must never be preselected or activated by default"
  );
  requireSource(/can\(cidrnetmask\(var\.staging_subnet_cidr\)\)/,
    "IPv4-only subnet validation");
  requireSource(/can\(regex\("\/2\[4-6\]\$",\s*var\.staging_subnet_cidr\)\)/,
    "Cloud Run-compatible reviewed CIDR size");
  requireSource(/cidrhost\(var\.staging_subnet_cidr,\s*0\)\s*==\s*split\("\/",\s*var\.staging_subnet_cidr\)\[0\]/,
    "canonical subnet network boundary");
  requireSource(/var\.staging_subnet_cidr\s*!=\s*null/,
    "missing CIDR cannot be used to authorise provisioning");
});

test("PAY54 private VPC remains separate from the observed default network", () => {
  requireSource(/resource\s+"google_compute_network"\s+"staging"\s*\{/,
    "dedicated custom-mode PAY54 network");
  requireSource(/auto_create_subnetworks\s*=\s*false/,
    "custom-mode network rather than default auto subnets");
  requireSource(/name\s*=\s*"pay54-staging-private"/,
    "dedicated network name");
  assert.doesNotMatch(source, /resource\s+"google_compute_network"\s+"default"/);
});

test("required Terraform APIs do not automatically enable Compute Engine", () => {
  const list = source.match(/\brequired_apis\s*=\s*toset\(\[([\s\S]*?)\]\)/);
  assert.ok(list, "Explicit required_apis inventory must exist");
  assert.doesNotMatch(list[1], /compute\.googleapis\.com/,
    "Compute API activation is a separate cloud governance event");
});

test("unapproved outbound internet connectivity remains denied in source", () => {
  requireSource(/resource\s+"google_compute_firewall"\s+"egress_deny"/,
    "targeted outbound firewall");
  requireSource(/destination_ranges\s*=\s*\["0\.0\.0\.0\/0"\]/,
    "complete IPv4 egress restriction");
  requireSource(/deny\s*\{\s*protocol\s*=\s*"all"\s*\}/,
    "deny all protocols for the tagged workload");
  requireSource(/egress\s*=\s*"ALL_TRAFFIC"/,
    "Direct VPC all-traffic routing");
  assert.doesNotMatch(source, /resource\s+"google_compute_router_nat"/,
    "No Cloud NAT before approved outbound gateway");
});
