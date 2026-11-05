
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — BACKEND HOSTING RELEASE POLICY
   File: backend/deployment/hosting-policy.mjs
   Version: 1.0.0

   Validates the initial news-only staging deployment manifest.
   Pure configuration validation: no cloud API calls or deployments.
   ========================================================================== */

export const HOSTING_POLICY_VERSION = "1.0.0";

export const STAGING_BASELINE = Object.freeze({
  environment: "staging",
  provider: "google-cloud-run",
  region: "europe-west2",
  service: "pay54-news-staging",
  ingress: "internal",
  requireAuthentication: true,
  allowUnauthenticated: false,
  newsProviderEnabled: false,
  financialExecutionEnabled: false,
  customerDataEnabled: false,
  secretsInRepository: false
});

const EXPECTED_KEYS = Object.freeze([
  ...Object.keys(STAGING_BASELINE),
  "image"
]);

const IMAGE_PATTERN =
  /^[a-z0-9][a-z0-9._:/-]*@sha256:[a-f0-9]{64}$/u;

function isPlainRecord(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (
      Object.getPrototypeOf(value) ===
        Object.prototype ||
      Object.getPrototypeOf(value) === null
    )
  );
}

/**
 * The initial PAY54 staging policy is intentionally fixed.
 * Production and public deployment are separate decisions.
 *
 * Every required property must be explicit. No implicit
 * defaults can silently make an unsafe deployment valid.
 */
export function validateHostingManifest(manifest) {
  if (!isPlainRecord(manifest)) {
    throw new TypeError(
      "Hosting manifest must be a plain object"
    );
  }

  const keys = Object.keys(manifest);

  const missing = EXPECTED_KEYS.filter(
    key => !Object.hasOwn(manifest, key)
  );

  const unexpected = keys.filter(
    key => !EXPECTED_KEYS.includes(key)
  );

  const violations = [];

  if (missing.length) {
    violations.push(
      `Missing required fields: ${missing.join(", ")}`
    );
  }

  if (unexpected.length) {
    violations.push(
      `Unexpected fields: ${unexpected.join(", ")}`
    );
  }

  for (const [key, expected] of Object.entries(
    STAGING_BASELINE
  )) {
    if (
      Object.hasOwn(manifest, key) &&
      manifest[key] !== expected
    ) {
      violations.push(
        `${key} violates the staging baseline`
      );
    }
  }

  if (
    Object.hasOwn(manifest, "image") &&
    (
      typeof manifest.image !== "string" ||
      !IMAGE_PATTERN.test(manifest.image)
    )
  ) {
    violations.push(
      "image must reference an immutable SHA-256 container digest"
    );
  }

  return Object.freeze({
    valid: violations.length === 0,
    policyVersion: HOSTING_POLICY_VERSION,
    environment: "staging",
    violations: Object.freeze(violations)
  });
}

export function assertHostingManifest(manifest) {
  const result = validateHostingManifest(manifest);

  if (!result.valid) {
    throw new Error(
      `PAY54 staging deployment rejected: ${result.violations.join("; ")}`
    );
  }

  return result;
}

/**
 * A verified manifest is necessary but not sufficient
 * for cloud deployment. IAM, ingress, image provenance,
 * infrastructure controls and release approval must also
 * be independently checked.
 */
