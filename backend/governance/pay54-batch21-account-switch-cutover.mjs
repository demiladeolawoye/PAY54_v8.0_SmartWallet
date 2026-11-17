"use strict";

/**
 * PAY54 Batch 21 / 810 — fail-closed account switch cutover checklist.
 *
 * This is a static engineering gap evaluator. Its inputs are claims, NOT
 * cryptographically proven operational evidence, and cannot grant release.
 * Separate Founder, Security and Release sign-off is always required.
 */
export const PAY54_SWITCH_CUTOVER_CONTROLS = Object.freeze([
  "trusted-identity-and-session-store",
  "authoritative-account-memberships",
  "enforced-postgresql-rls-and-tenant-tests",
  "atomic-session-rotation-and-revocation",
  "csrf-origin-and-one-time-replay-fence",
  "append-only-account-context-audit",
  "ten-domain-cache-and-request-isolation",
  "role-scoped-payment-authorization",
  "kyc-kyb-and-provider-eligibility",
  "protected-deployer-and-rollback",
  "current-pages-artifact-containment",
  "authenticated-mobile-desktop-accessibility-qa"
]);
const deny = () => { throw new Error("PAY54_ACCOUNT_CUTOVER_EVIDENCE_INVALID"); };

export function assessPay54AccountSwitchCutoverClaims(claims = {}) {
  if (!claims || typeof claims !== "object" || Array.isArray(claims) ||
      Object.keys(claims).some(k => !PAY54_SWITCH_CUTOVER_CONTROLS.includes(k))) deny();

  const missing = PAY54_SWITCH_CUTOVER_CONTROLS.filter(k => claims[k] !== true);
  return Object.freeze({
    schema: "pay54.account-switch-cutover-claims.v1",
    claimedControlsComplete: missing.length === 0,
    controlsMissing: Object.freeze(missing),
    requiresIndependentEvidenceVerification: true,
    requiresFounderSecurityReleaseApproval: true,
    authorisesDeployment: false,
    authorisesMoneyMovement: false,
    accountSwitchEnabled: false,
    productionReady: false
  });
}
