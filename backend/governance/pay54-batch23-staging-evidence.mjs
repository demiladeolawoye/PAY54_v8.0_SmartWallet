"use strict";

/**
 * PAY54 Batch 23 / 885 — cryptographic staging evidence verifier.
 *
 * Trusted Ed25519 verification keys MUST be injected by server-managed
 * Security/Release configuration. Browser-supplied keys are never trusted.
 * This verifies signatures, freshness, SHA binding and evidence-category
 * completeness. It NEVER authorises production, executes a migration or
 * certifies the underlying physical evidence independently.
 */
import { createPublicKey, verify as verifyEd25519 } from "node:crypto";

export const PAY54_STAGING_EVIDENCE_CATEGORIES = Object.freeze([
  "database-role-posture",
  "tenant-rls-isolation",
  "atomic-session-replay",
  "rollback-rehearsal",
  "pages-artifact-containment",
  "regulated-payment-acceptance",
  "authenticated-device-qa"
]);

const SHA = /^[0-9a-f]{40}$/;
const DIGEST = /^[0-9a-f]{64}$/;
const REVIEWER = /^[a-z0-9._-]{3,64}$/;
const SIGNATURE = /^[A-Za-z0-9_-]{86}$/;
const deny = () => { throw new Error("PAY54_STAGING_EVIDENCE_DENIED"); };

export function encodePay54StagingAttestation({
  category, commitSha, evidenceDigest, reviewer, signedAtMs
} = {}) {
  if (!PAY54_STAGING_EVIDENCE_CATEGORIES.includes(category) ||
      !SHA.test(commitSha ?? "") || !DIGEST.test(evidenceDigest ?? "") ||
      !REVIEWER.test(reviewer ?? "") ||
      !Number.isSafeInteger(signedAtMs) || signedAtMs <= 0) deny();
  return Buffer.from([
    "PAY54_STAGING_ATTESTATION_V1",
    category, commitSha, evidenceDigest, reviewer, String(signedAtMs)
  ].join("\n"), "utf8");
}

export function createPay54StagingEvidenceVerifier({
  trustedPublicKeys,
  trustedNowMs = Date.now
} = {}) {
  if (!trustedPublicKeys || typeof trustedPublicKeys !== "object" ||
      Array.isArray(trustedPublicKeys) ||
      typeof trustedNowMs !== "function") deny();

  const keys = new Map();
  for (const category of PAY54_STAGING_EVIDENCE_CATEGORIES) {
    try {
      const supplied = Object.hasOwn(trustedPublicKeys, category)
        ? trustedPublicKeys[category] : null;
      const key = createPublicKey(supplied);
      if (key.asymmetricKeyType !== "ed25519") deny();
      keys.set(category, key);
    } catch { deny(); }
  }

  return Object.freeze({
    verifyForReview({ expectedCommitSha, attestations } = {}) {
      if (!SHA.test(expectedCommitSha ?? "") ||
          !Array.isArray(attestations) ||
          attestations.length > PAY54_STAGING_EVIDENCE_CATEGORIES.length) deny();
      const now = trustedNowMs();
      if (!Number.isSafeInteger(now) || now <= 0) deny();
      const seen = new Set();
      const reviewers = new Set();
      for (const a of attestations) {
        if (!a || typeof a !== "object" || Array.isArray(a) ||
            !PAY54_STAGING_EVIDENCE_CATEGORIES.includes(a.category) ||
            seen.has(a.category) || a.commitSha !== expectedCommitSha ||
            typeof a.signature !== "string" || !SIGNATURE.test(a.signature) ||
            typeof a.signedAtMs !== "number" ||
            a.signedAtMs > now || now - a.signedAtMs > 24 * 60 * 60 * 1000) deny();
        const payload = encodePay54StagingAttestation(a);
        const signature = Buffer.from(a.signature, "base64url");
        if (signature.length !== 64 ||
            signature.toString("base64url") !== a.signature ||
            !verifyEd25519(null, payload, keys.get(a.category), signature)) deny();
        seen.add(a.category);
        reviewers.add(a.reviewer);
      }

      const missing = PAY54_STAGING_EVIDENCE_CATEGORIES.filter(
        category => !seen.has(category)
      );
      return Object.freeze({
        schema: "pay54.staging-signed-evidence-review.v1",
        expectedCommitSha,
        verifiedCategoryCount: seen.size,
        distinctReviewerCount: reviewers.size,
        missingCategories: Object.freeze(missing),
        evidenceSetCompleteForManualReview: missing.length === 0 &&
          reviewers.size >= 3,
        physicalEnvironmentIndependentlyVerified: false,
        productionDeploymentAuthorised: false,
        accountSwitchProductionEnabled: false
      });
    }
  });
}
