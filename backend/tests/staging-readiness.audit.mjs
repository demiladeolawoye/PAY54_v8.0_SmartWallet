
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — STAGING READINESS AUDIT
   File: backend/tests/staging-readiness.audit.mjs
   Version: 1.0.0

   Static repository audit only.
   No cloud authentication, provisioning, deployment or financial execution.
   ========================================================================== */

import { appendFileSync, readFileSync } from "node:fs";

const sources = [
  ["terraform", new URL("../../infrastructure/staging/main.tf", import.meta.url)],
  ["workflow", new URL("../../.github/workflows/pay54-staging-infrastructure-tests.yml", import.meta.url)],
  ["tests", new URL("./staging-infrastructure.test.mjs", import.meta.url)]
];

const input = new Map();
const findings = [];

function report(area, status, detail) {
  if (!["PASS", "FAIL", "NOT_CONFIGURED"].includes(status)) {
    throw new TypeError("Unknown readiness status");
  }

  findings.push({ area, status, detail });
}

for (const [name, path] of sources) {
  try {
    input.set(name, readFileSync(path, "utf8"));
  } catch (error) {
    input.set(name, "");
    report(
      `Source: ${name}`,
      "FAIL",
      `Required repository file unavailable (${error.code || "read error"}).`
    );
  }
}

const tf = input.get("terraform");
const ci = input.get("workflow");
const tests = input.get("tests");

function check(area, passed, onSuccess, onFailure) {
  report(
    area,
    passed ? "PASS" : "FAIL",
    passed ? onSuccess : onFailure
  );
}

function contains(value, regex) {
  return regex.test(value);
}

function guardedResource(type) {
  const expression = new RegExp(
    `resource\\s+"${type}"\\s+"[^"]+"\\s*\\{\\s*` +
    `count\\s*=\\s*local\\.enabled\\s*\\?\\s*1\\s*:\\s*0`
  );

  return contains(tf, expression);
}

check(
  "Provisioning disabled by default",
  contains(
    tf,
    /variable\s+"authorized_provisioning"\s*\{[^}]*default\s*=\s*false/s
  ) &&
  contains(tf, /enabled\s*=\s*var\.authorized_provisioning/) &&
  contains(ci, /TF_VAR_authorized_provisioning:\s*["']false["']/),
  "Terraform and infrastructure CI default to no provisioning.",
  "A required provisioning safety control is absent or changed."
);

const guarded = [
  "google_service_account",
  "google_artifact_registry_repository",
  "google_iam_workload_identity_pool",
  "google_iam_workload_identity_pool_provider",
  "google_cloud_run_v2_service",
  "google_cloud_run_v2_service_iam_member",
  "google_service_account_iam_member",
  "google_artifact_registry_repository_iam_member"
];

check(
  "Provisioned resources creation-gated",
  guarded.every(guardedResource) &&
  contains(
    tf,
    /for_each\s*=\s*local\.enabled\s*\?\s*local\.required_apis\s*:\s*toset\(\[\]\)/
  ),
  "Expected resources and service API enablement are conditional.",
  "One or more resource types or service API enablement lack the expected creation guard."
);

check(
  "London staging region",
  contains(tf, /region\s*=\s*"europe-west2"/),
  "London region europe-west2 is specified.",
  "Approved London region could not be verified."
);

check(
  "GitHub workload identity remains disabled",
  contains(
    tf,
    /resource\s+"google_iam_workload_identity_pool_provider"\s+"github"\s*\{[\s\S]*?disabled\s*=\s*true/
  ) &&
  contains(
    tf,
    /issuer_uri\s*=\s*"https:\/\/token\.actions\.githubusercontent\.com"/
  ),
  "GitHub OIDC provider is declared but disabled.",
  "Federation disabled status or issuer is not verified."
);

check(
  "GitHub immutable identity and context restrictions",
  [
    /assertion\.repository_id\s*==/,
    /assertion\.repository_owner_id\s*==/,
    /assertion\.ref\s*==/,
    /assertion\.environment\s*==/,
    /assertion\.event_name\s*==\s*'workflow_dispatch'/,
    /assertion\.workflow_ref\s*==/,
    /refs\/heads\/project-titan/,
    /pay54-staging-deploy\.yml/
  ].every((pattern) => contains(tf, pattern)),
  "Trust condition includes immutable IDs, protected context and exact workflow identity.",
  "Required repository, branch, environment, event or workflow identity restriction is missing."
);

check(
  "Cloud Run private invocation",
  contains(
    tf,
    /ingress\s*=\s*"INGRESS_TRAFFIC_INTERNAL_ONLY"/
  ) &&
  contains(tf, /invoker_iam_disabled\s*=\s*false/) &&
  !contains(
    tf,
    /member\s*=\s*"(?:allUsers|allAuthenticatedUsers)"/
  ) &&
  !contains(
    tf,
    /ingress\s*=\s*"INGRESS_TRAFFIC_ALL"/
  ),
  "Internal-only ingress and IAM-authenticated invocation are configured.",
  "Cloud Run ingress or authentication policy does not match the private baseline."
);

check(
  "Cloud Run capacity and deletion controls",
  contains(tf, /deletion_protection\s*=\s*true/) &&
  contains(tf, /min_instance_count\s*=\s*0/) &&
  contains(tf, /max_instance_count\s*=\s*1/) &&
  contains(tf, /cpu\s*=\s*"1"/) &&
  contains(tf, /memory\s*=\s*"512Mi"/),
  "Staging service specifies deletion protection and bounded compute.",
  "Deletion protection, instance limits or compute limits differ from the approved baseline."
);

check(
  "Deployer and runtime identities separated",
  contains(
    tf,
    /account_id\s*=\s*"pay54-staging-deployer"/
  ) &&
  contains(
    tf,
    /account_id\s*=\s*"pay54-staging-runtime"/
  ) &&
  contains(
    tf,
    /service_account\s*=\s*google_service_account\.runtime\[0\]\.email/
  ),
  "Separate deployer and runtime service accounts are declared.",
  "Distinct deployer/runtime service identities could not be verified."
);

check(
  "Immutable regional container image",
  contains(tf, /@sha256:\[a-f0-9\]\{64\}/) &&
  contains(tf, /europe-west2-docker/) &&
  contains(tf, /image\s*=\s*var\.container_image/),
  "Container input is restricted to a regional image digest by precondition.",
  "The SHA-256 regional image requirement or its container binding is missing."
);

check(
  "Forbidden privileged grants absent",
  !contains(
    tf,
    /roles\/(?:owner|editor|run\.admin|artifactregistry\.admin|iam\.serviceAccountKeyAdmin)/
  ) &&
  !contains(
    tf,
    /member\s*=\s*"(?:allUsers|allAuthenticatedUsers)"/
  ),
  "No forbidden privileged IAM role or public member detected in Terraform source.",
  "Forbidden IAM role or public member detected."
);

check(
  "Read-only infrastructure CI",
  contains(ci, /terraform\s+init\s+-backend=false/) &&
  contains(ci, /terraform\s+validate/) &&
  contains(ci, /terraform\s+fmt\s+-check/) &&
  !contains(
    ci,
    /^\s*(?:terraform\s+(?:apply|destroy)|gcloud\s+run\s+deploy)\b/m
  ) &&
  contains(
    ci,
    /permissions:\s*\n\s*contents:\s*read/
  ) &&
  contains(
    tests,
    /test\("provisioning is disabled by default"/
  ),
  "CI validates configuration without cloud credentials or apply/destroy commands.",
  "Read-only validation steps or the provisioning regression test are missing."
);

const requiredApis = [
  "artifactregistry.googleapis.com",
  "iam.googleapis.com",
  "iamcredentials.googleapis.com",
  "run.googleapis.com",
  "sts.googleapis.com"
];

check(
  "Baseline Google Cloud APIs declared",
  requiredApis.every((api) => tf.includes(`"${api}"`)),
  "Required baseline API declarations are present; enablement is still gated.",
  "One or more baseline API declarations are missing."
);

report(
  "Actual cloud project and identity verification",
  "NOT_CONFIGURED",
  "No live project, immutable GitHub IDs, provider activation or cloud account is verified by this offline audit."
);

report(
  "Secret Manager integration",
  "NOT_CONFIGURED",
  "No approved Secret Manager resources or application secret-access configuration have been verified."
);

report(
  "Budget and cost alerts",
  "NOT_CONFIGURED",
  "No configured cloud billing budget or alert delivery has been verified."
);

report(
  "GitHub environment approval rules",
  "NOT_CONFIGURED",
  "The pay54-staging environment is referenced, but repository environment reviewers and protections require separate verification."
);

report(
  "Container provenance and deployed image",
  "NOT_CONFIGURED",
  "Digest validation exists, but signed provenance, approved image existence and the runtime image are not verified offline."
);

report(
  "Private network, egress and application security",
  "NOT_CONFIGURED",
  "Internal ingress is declared; full service-to-service access, egress, networking and application authorization have not been verified."
);

report(
  "Cloud provisioning authorisation",
  "NOT_CONFIGURED",
  "No provisioning authorisation is issued by this audit; Terraform apply remains outside CI."
);

const counts = Object.fromEntries(
  ["PASS", "FAIL", "NOT_CONFIGURED"].map((status) => [
    status,
    findings.filter((finding) => finding.status === status).length
  ])
);

const rows = findings.map(({ area, status, detail }) =>
  `| ${area} | ${status} | ${detail} |`
);

const summary = [
  "## PAY54 Phase 2G-K — Staging Infrastructure Readiness",
  "",
  "**Static source audit only. No cloud authentication, provisioning or deployment.**",
  "",
  `Results: ${counts.PASS} PASS · ${counts.FAIL} FAIL · ${counts.NOT_CONFIGURED} NOT_CONFIGURED`,
  "",
  "| Control | Status | Evidence / limitation |",
  "| --- | --- | --- |",
  ...rows,
  "",
  "NOT_CONFIGURED items require independently verified evidence before any staging provisioning approval."
].join("\n");

process.stdout.write(`${summary}\n`);

if (process.env.GITHUB_STEP_SUMMARY) {
  try {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `${summary}\n`,
      "utf8"
    );
  } catch (error) {
    process.stderr.write(
      `Could not write Actions summary: ${error.message}\n`
    );
    process.exitCode = 1;
  }
}

if (counts.FAIL > 0) {
  process.exitCode = 1;
}
