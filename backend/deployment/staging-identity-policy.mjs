
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — STAGING IDENTITY POLICY
   File: backend/deployment/staging-identity-policy.mjs
   Version: 1.0.0

   Security contract for future GitHub -> Google Cloud authentication.

   This module:
   - Produces a restrictive Google Workload Identity Federation condition.
   - Validates expected GitHub OIDC identity claims.
   - Declares least-privilege deployment requirements.
   - Does not authenticate or deploy anything.
   ========================================================================== */

export const VERSION = "1.0.0";

export const TRUSTED_GITHUB = Object.freeze({
  owner: "demiladeolawoye",
  repository: "demiladeolawoye/PAY54_v8.0_SmartWallet",
  ref: "refs/heads/project-titan",
  environment: "pay54-staging",
  event: "workflow_dispatch",
  workflow:
    "demiladeolawoye/PAY54_v8.0_SmartWallet/" +
    ".github/workflows/pay54-staging-deploy.yml@" +
    "refs/heads/project-titan",
  issuer: "https://token.actions.githubusercontent.com"
});

export const STAGING_INFRASTRUCTURE = Object.freeze({
  cloud: "google-cloud",
  service: "pay54-news-staging",
  region: "europe-west2",
  platform: "cloud-run",
  ingress: "internal",
  authenticationRequired: true,
  publicInvokerAllowed: false,
  deploymentApprovalRequired: true,
  imageDigestRequired: true,
  imageScanningRequired: true,
  imageProvenanceRequired: true,
  rollbackRequired: true,
  auditLoggingRequired: true,
  providerEnabled: false,
  financialExecutionEnabled: false,
  customerDataEnabled: false
});

export const IAM_BOUNDARY = Object.freeze({
  federationMethod: "workload-identity-federation",
  serviceAccountKeysAllowed: false,
  deployerAndRuntimeSeparated: true,
  deployerProjectOwnerAllowed: false,
  deployerProjectEditorAllowed: false,
  runtimeCloudRunAdminAllowed: false,
  runtimeArtifactWriterAllowed: false,
  deploymentRoles: Object.freeze([
    Object.freeze({
      role: "roles/run.developer",
      resource: "specific Cloud Run service"
    }),
    Object.freeze({
      role: "roles/artifactregistry.reader",
      resource: "specific Artifact Registry repository"
    }),
    Object.freeze({
      role: "roles/iam.serviceAccountUser",
      resource: "specific runtime service account"
    })
  ]),
  federationRole: "roles/iam.workloadIdentityUser"
});

function isRecord(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (
      Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null
    )
  );
}

function requireNumericIdentity(value, name) {
  const text = String(value ?? "");

  if (
    !/^[1-9][0-9]*$/u.test(text) ||
    text.length > 20
  ) {
    throw new TypeError(
      `${name} must be a positive decimal GitHub identity ID`
    );
  }

  return text;
}

function quoteCel(value) {
  return JSON.stringify(value);
}

/*
 * GitHub repository_id and repository_owner_id are immutable
 * numeric identifiers. Obtain their actual values from GitHub
 * when configuring the real cloud identity provider.
 *
 * They are mandatory arguments, never guessed or substituted
 * with fictitious production values.
 */
export function createStagingIdentityPolicy({
  repositoryId,
  ownerId
} = {}) {
  const repositoryIdentity = requireNumericIdentity(
    repositoryId,
    "repositoryId"
  );

  const ownerIdentity = requireNumericIdentity(
    ownerId,
    "ownerId"
  );

  const requirements = Object.freeze({
    repository_id: repositoryIdentity,
    repository_owner_id: ownerIdentity,
    repository: TRUSTED_GITHUB.repository,
    repository_owner: TRUSTED_GITHUB.owner,
    ref: TRUSTED_GITHUB.ref,
    environment: TRUSTED_GITHUB.environment,
    event_name: TRUSTED_GITHUB.event,
    workflow_ref: TRUSTED_GITHUB.workflow
  });

  const condition = Object.entries(requirements)
    .map(([name, value]) =>
      `assertion.${name} == ${quoteCel(value)}`
    )
    .join(" && ");

  const attributeMapping = Object.freeze({
    "google.subject": "assertion.sub",
    "attribute.repository_id": "assertion.repository_id",
    "attribute.repository_owner_id":
      "assertion.repository_owner_id",
    "attribute.ref": "assertion.ref",
    "attribute.environment": "assertion.environment"
  });

  return Object.freeze({
    version: VERSION,
    issuer: TRUSTED_GITHUB.issuer,
    requirements,
    condition,
    attributeMapping,
    infrastructure: STAGING_INFRASTRUCTURE,
    iam: IAM_BOUNDARY,
    deploymentEnabled: false
  });
}

export function validateGitHubIdentityClaims(
  claims,
  policy
) {
  const violations = [];

  if (
    !isRecord(claims) ||
    !isRecord(policy) ||
    !isRecord(policy.requirements)
  ) {
    return Object.freeze({
      valid: false,
      violations: Object.freeze([
        "Invalid identity claims or trust policy"
      ])
    });
  }

  if (claims.iss !== TRUSTED_GITHUB.issuer) {
    violations.push("Unexpected OIDC issuer");
  }

  for (
    const [name, expected] of
    Object.entries(policy.requirements)
  ) {
    if (claims[name] !== expected) {
      violations.push(
        `Untrusted GitHub identity claim: ${name}`
      );
    }
  }

  /*
   * This validation models expected token claims.
   * Actual token signature, issuer, audience and expiry
   * verification MUST be performed by Google's OIDC/WIF
   * implementation, never by this application module.
   */

  return Object.freeze({
    valid: violations.length === 0,
    violations: Object.freeze(violations)
  });
}

export function assertStagingIdentityClaims(
  claims,
  policy
) {
  const result = validateGitHubIdentityClaims(
    claims,
    policy
  );

  if (!result.valid) {
    throw new Error(
      "PAY54 staging identity rejected: " +
      result.violations.join("; ")
    );
  }

  return result;
}

export function validateInfrastructureContract(
  contract
) {
  const violations = [];

  if (!isRecord(contract)) {
    return Object.freeze({
      valid: false,
      violations: Object.freeze([
        "Infrastructure contract must be a plain object"
      ])
    });
  }

  for (
    const [name, expected] of
    Object.entries(STAGING_INFRASTRUCTURE)
  ) {
    if (
      !Object.hasOwn(contract, name) ||
      contract[name] !== expected
    ) {
      violations.push(
        `Infrastructure requirement violated: ${name}`
      );
    }
  }

  for (const name of Object.keys(contract)) {
    if (!Object.hasOwn(STAGING_INFRASTRUCTURE, name)) {
      violations.push(
        `Unapproved infrastructure setting: ${name}`
      );
    }
  }

  return Object.freeze({
    valid: violations.length === 0,
    violations: Object.freeze(violations)
  });
}
