
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — STG-03 SECRET MANAGER SECURITY POLICY
   File: backend/security/staging-secret-policy.mjs
   Version: 1.0.0

   Declarative offline policy. This module does not connect to Google Cloud,
   request credentials, enable APIs, provision secrets or read secret values.
   ========================================================================== */

const SECRET_ID_PATTERN = /^pay54-stg-[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const VERSION_PATTERN = /^[1-9][0-9]*$/;

const definitions = [
  {
    id: "pay54-stg-news-provider-api-key",
    consumer: "pay54-news-staging",
    classification: "CONFIDENTIAL_CREDENTIAL",
    purpose: "Future approved news-provider authentication"
  },
  {
    id: "pay54-stg-news-webhook-signing-key",
    consumer: "pay54-news-staging",
    classification: "CONFIDENTIAL_CREDENTIAL",
    purpose: "Future approved inbound webhook signature verification"
  }
];

export const STAGING_SECRET_POLICY = Object.freeze({
  version: "1.0.0",
  phase: "STG-03",
  environment: "pay54-staging",
  projectId: "pay54-staging-uk-01",
  region: "europe-west2",
  mode: "POLICY_ONLY",
  secretManagerApiEnabled: false,
  provisioningAuthorized: false,
  createSecrets: false,
  issueCredentials: false,
  financialExecutionEnabled: false,
  runtimeServiceAccountId: "pay54-staging-runtime",
  deployerServiceAccountId: "pay54-staging-deployer",
  identityProviderActivated: false,

  storage: Object.freeze({
    preferredSecretType: "REGIONAL",
    approvedRegion: "europe-west2",
    approvedVersionReference: "EXPLICIT_NUMERIC_VERSION",
    prohibitLatestAlias: true,
    prohibitEmbeddedSecretValues: true,
    prohibitBrowserSecretExposure: true,
    prohibitServiceAccountKeyFiles: true
  }),

  access: Object.freeze({
    runtimeRole: "roles/secretmanager.secretAccessor",
    runtimeGrantScope: "INDIVIDUAL_SECRET",
    deployerCanReadPayload: false,
    githubActionsCanReadPayload: false,
    prohibitProjectWideAccessor: true,
    prohibitPublicPrincipals: true,
    approvalRequiredBeforeGrant: true
  }),

  operations: Object.freeze({
    accessAuditLogsRequired: true,
    auditLogService: "secretmanager.googleapis.com",
    auditAccessMethod: "AccessSecretVersion",
    auditLogsConfigured: false,
    rotationReviewDays: 90,
    incidentRevocationRequired: true,
    verifyRollbackBeforeRotation: true,
    rotateByVersionReplacement: true,
    automaticRotationEnabled: false,
    independentSecurityReviewRequired: true
  }),

  secretDefinitions: Object.freeze(
    definitions.map((item) => Object.freeze(item))
  )
});

export function validateSecretId(secretId) {
  return (
    typeof secretId === "string" &&
    secretId.length <= 255 &&
    SECRET_ID_PATTERN.test(secretId)
  );
}

export function validateSecretVersion(version) {
  return (
    typeof version === "string" &&
    VERSION_PATTERN.test(version)
  );
}

export function validateSecretReference(reference) {
  if (typeof reference !== "string") {
    return false;
  }

  const match =
    /^projects\/([^/]+)\/locations\/([^/]+)\/secrets\/([^/]+)\/versions\/([^/]+)$/
      .exec(reference);

  if (!match) {
    return false;
  }

  const [, project, location, secretId, version] = match;

  return (
    project === STAGING_SECRET_POLICY.projectId &&
    location === STAGING_SECRET_POLICY.region &&
    validateSecretId(secretId) &&
    STAGING_SECRET_POLICY.secretDefinitions.some(
      (secret) => secret.id === secretId
    ) &&
    validateSecretVersion(version)
  );
}

export function validateStagingSecretPolicy(
  policy = STAGING_SECRET_POLICY
) {
  if (!policy || typeof policy !== "object") {
    return false;
  }

  const requiredDisabled = [
    "secretManagerApiEnabled",
    "provisioningAuthorized",
    "createSecrets",
    "issueCredentials",
    "financialExecutionEnabled",
    "identityProviderActivated"
  ];

  if (
    !requiredDisabled.every(
      (name) => policy[name] === false
    )
  ) {
    return false;
  }

  if (
    policy.mode !== "POLICY_ONLY" ||
    policy.region !== "europe-west2"
  ) {
    return false;
  }

  if (policy.projectId !== "pay54-staging-uk-01") {
    return false;
  }

  if (
    policy.runtimeServiceAccountId ===
    policy.deployerServiceAccountId
  ) {
    return false;
  }

  const storage = policy.storage;
  const access = policy.access;
  const operations = policy.operations;

  if (!storage || !access || !operations) {
    return false;
  }

  if (
    storage.preferredSecretType !== "REGIONAL" ||
    storage.approvedRegion !== policy.region ||
    storage.approvedVersionReference !==
      "EXPLICIT_NUMERIC_VERSION" ||
    !storage.prohibitLatestAlias ||
    !storage.prohibitEmbeddedSecretValues ||
    !storage.prohibitBrowserSecretExposure ||
    !storage.prohibitServiceAccountKeyFiles
  ) {
    return false;
  }

  if (
    access.runtimeRole !==
      "roles/secretmanager.secretAccessor" ||
    access.runtimeGrantScope !== "INDIVIDUAL_SECRET" ||
    access.deployerCanReadPayload !== false ||
    access.githubActionsCanReadPayload !== false ||
    !access.prohibitProjectWideAccessor ||
    !access.prohibitPublicPrincipals ||
    !access.approvalRequiredBeforeGrant
  ) {
    return false;
  }

  if (
    !operations.accessAuditLogsRequired ||
    operations.auditLogService !==
      "secretmanager.googleapis.com" ||
    operations.auditAccessMethod !== "AccessSecretVersion" ||
    operations.auditLogsConfigured !== false ||
    !Number.isSafeInteger(operations.rotationReviewDays) ||
    operations.rotationReviewDays < 1 ||
    operations.rotationReviewDays > 90 ||
    !operations.incidentRevocationRequired ||
    !operations.verifyRollbackBeforeRotation ||
    !operations.rotateByVersionReplacement ||
    operations.automaticRotationEnabled !== false ||
    !operations.independentSecurityReviewRequired
  ) {
    return false;
  }

  if (
    !Array.isArray(policy.secretDefinitions) ||
    policy.secretDefinitions.length === 0
  ) {
    return false;
  }

  const ids = new Set();

  for (const item of policy.secretDefinitions) {
    if (
      !item ||
      !validateSecretId(item.id) ||
      ids.has(item.id) ||
      item.consumer !== "pay54-news-staging" ||
      item.classification !== "CONFIDENTIAL_CREDENTIAL" ||
      typeof item.purpose !== "string" ||
      item.purpose.length < 10
    ) {
      return false;
    }

    ids.add(item.id);
  }

  return true;
}
