
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — STAGING RELEASE SECURITY CONTRACT
   File: backend/deployment/staging-release-policy.mjs
   Version: 1.0.0

   Planning-time policy validation only.
   No cloud authentication, deployment, API access or financial execution.
   ========================================================================== */

import {
  validateHostingManifest
} from "./hosting-policy.mjs";

export const STAGING_RELEASE_POLICY_VERSION = "1.0.0";

const REQUIRED_RELEASE = Object.freeze({
  repository: "demiladeolawoye/PAY54_v8.0_SmartWallet",
  branch: "project-titan",
  githubEnvironment: "pay54-staging",
  targetProvider: "google-cloud-run",
  region: "europe-west2",
  service: "pay54-news-staging",
  deploymentMode: "approval-gated",
  automaticDeployment: false,
  productionDeployment: false
});

const REQUIRED_IDENTITY = Object.freeze({
  mechanism: "workload-identity-federation",
  issuer: "https://token.actions.githubusercontent.com",
  serviceAccountKeyAllowed: false,
  repositoryRestricted: true,
  branchRestricted: true,
  environmentRestricted: true,
  dedicatedDeployerIdentity: true,
  dedicatedRuntimeIdentity: true
});

const REQUIRED_CONTROLS = Object.freeze({
  authenticatedInvocation: true,
  internalIngress: true,
  publicAccessAllowed: false,
  immutableImageDigest: true,
  imageVulnerabilityAssessmentRequired: true,
  provenanceVerificationRequired: true,
  protectedEnvironmentReviewRequired: true,
  rollbackProcedureRequired: true,
  cloudAuditLoggingRequired: true,
  realCustomerDataAllowed: false,
  newsProviderEnabled: false,
  financialExecutionEnabled: false
});

export const STAGING_RELEASE_BASELINE = Object.freeze({
  release: REQUIRED_RELEASE,
  identity: REQUIRED_IDENTITY,
  controls: REQUIRED_CONTROLS
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

function compareExact(actual, expected, prefix, violations) {
  if (!isRecord(actual)) {
    violations.push(`${prefix} must be a plain object`);
    return;
  }

  for (const key of Object.keys(expected)) {
    if (!Object.hasOwn(actual, key)) {
      violations.push(`${prefix}.${key} is missing`);
    } else if (actual[key] !== expected[key]) {
      violations.push(`${prefix}.${key} violates staging policy`);
    }
  }

  for (const key of Object.keys(actual)) {
    if (!Object.hasOwn(expected, key)) {
      violations.push(`${prefix}.${key} is not permitted`);
    }
  }
}

export function validateStagingReleaseContract(contract) {
  const violations = [];

  if (!isRecord(contract)) {
    return Object.freeze({
      valid: false,
      version: STAGING_RELEASE_POLICY_VERSION,
      violations: Object.freeze([
        "Release contract must be a plain object"
      ])
    });
  }

  const allowedKeys = [
    "release",
    "identity",
    "controls",
    "hostingManifest"
  ];

  for (const key of Object.keys(contract)) {
    if (!allowedKeys.includes(key)) {
      violations.push(`Unexpected release contract field: ${key}`);
    }
  }

  compareExact(
    contract.release,
    REQUIRED_RELEASE,
    "release",
    violations
  );

  compareExact(
    contract.identity,
    REQUIRED_IDENTITY,
    "identity",
    violations
  );

  compareExact(
    contract.controls,
    REQUIRED_CONTROLS,
    "controls",
    violations
  );

 const hostingResult =
  isRecord(contract.hostingManifest)
    ? validateHostingManifest(contract.hostingManifest)
    : {
        valid: false,
        violations: [
          "Hosting manifest must be a plain object"
        ]
      };

  if (!hostingResult.valid) {
    for (const violation of hostingResult.violations) {
      violations.push(`hostingManifest: ${violation}`);
    }
  }

  return Object.freeze({
    valid: violations.length === 0,
    version: STAGING_RELEASE_POLICY_VERSION,
    violations: Object.freeze(violations)
  });
}

export function assertStagingReleaseContract(contract) {
  const result = validateStagingReleaseContract(contract);

  if (!result.valid) {
    throw new Error(
      `PAY54 staging release contract rejected: ${
        result.violations.join("; ")
      }`
    );
  }

  return result;
}

/*
 * A passing contract validates declared requirements, NOT
 * actual GitHub or Google Cloud configuration.
 *
 * Before any deployment, independent verification must prove:
 * - GitHub environment reviewer protection is enabled
 * - WIF provider conditions bind trusted repository identity,
 *   branch and environment claims
 * - No service-account keys are issued
 * - Cloud IAM is least-privilege
 * - Service ingress is actually internal
 * - Invoker permissions exclude allUsers/allAuthenticatedUsers
 * - Image provenance and vulnerability gates are enforced
 * - A tested rollback path exists
 */
