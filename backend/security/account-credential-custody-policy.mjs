"use strict";

/*
 * PAY54 Batch 10 — item 213: offline credential custody evidence validator.
 *
 * Consumes externally verified evidence for source-level configuration review.
 * This module neither accesses a secret nor validates a cryptographic signature,
 * TLS peer, DB server or IAM policy. Never treat a successful result as
 * permission to connect to a live customer database.
 */

const ROLE = /^pay54_tenant_[a-z0-9_]{8,48}$/;
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ENVS = new Set(["test", "staging", "production"]);

function deny() {
  throw new Error("ACCOUNT_CREDENTIAL_CUSTODY_UNTRUSTED");
}

function record(value) {
  return value !== null && typeof value === "object" &&
    !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

/**
 * Validate the shape and mandatory negative assertions of independently
 * collected custody review metadata. Do not accept arbitrary free-form
 * network hosts, secrets or database passwords into the descriptor.
 *
 * @param {object} evidence — non-secret assessment metadata from a trusted reviewer
 * @returns {Readonly<object>} inert source-review verdict; never live proof
 */
export function assessAccountCredentialCustody(evidence) {
  if (!record(evidence) ||
      evidence.schemaVersion !== 1 ||
      !ID.test(evidence.tenantId ?? "") ||
      !ID.test(evidence.accountId ?? "") ||
      !ROLE.test(evidence.roleName ?? "") ||
      !ENVS.has(evidence.environment) ||
      typeof evidence.endpointId !== "string" ||
      !/^[a-z][a-z0-9-]{2,63}$/.test(evidence.endpointId) ||
      typeof evidence.reviewId !== "string" ||
      !/^[a-zA-Z0-9._-]{8,96}$/.test(evidence.reviewId) ||
      !Number.isSafeInteger(evidence.rotationEpoch) ||
      evidence.rotationEpoch < 1 ||
      evidence.workloadIdentityBound !== true ||
      evidence.tenantScopedSecretAccess !== true ||
      evidence.noCrossTenantSecretAccess !== true ||
      evidence.noProvisioningPrivileges !== true ||
      evidence.tlsPeerVerified !== true ||
      evidence.tlsHostnameVerified !== true ||
      evidence.endpointAllowlisted !== true ||
      evidence.noRoleSwitching !== true ||
      evidence.noPhysicalSessionSharing !== true ||
      evidence.financialPrivilegeAbsent !== true ||
      evidence.customerSelectGrantsAbsent !== true ||
      evidence.independentlyReviewed !== true) {
    deny();
  }

  const keys = Object.keys(evidence);
  const allowed = new Set([
    "schemaVersion", "tenantId", "accountId", "roleName", "environment",
    "endpointId", "reviewId", "rotationEpoch",
    "workloadIdentityBound", "tenantScopedSecretAccess",
    "noCrossTenantSecretAccess", "noProvisioningPrivileges",
    "tlsPeerVerified", "tlsHostnameVerified", "endpointAllowlisted",
    "noRoleSwitching", "noPhysicalSessionSharing",
    "financialPrivilegeAbsent", "customerSelectGrantsAbsent",
    "independentlyReviewed"
  ]);
  if (keys.some(key => !allowed.has(key))) deny();

  return Object.freeze({
    tenantId: evidence.tenantId.toLowerCase(),
    accountId: evidence.accountId.toLowerCase(),
    roleName: evidence.roleName,
    environment: evidence.environment,
    endpointId: evidence.endpointId,
    reviewId: evidence.reviewId,
    rotationEpoch: evidence.rotationEpoch,
    sourceReviewEligible: true,
    liveCredentialAttested: false,
    financialExecutionEnabled: false,
    customerDataAccessEnabled: false
  });
}
