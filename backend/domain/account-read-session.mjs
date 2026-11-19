"use strict";

/**
 * PAY54 Batch 21 / 774 — server-session eligibility preflight for account reads.
 *
 * Session details MUST be obtained from a trusted authenticated server
 * resolver. No client-provided principal, expiry, generation or session ID
 * can satisfy this contract. It is NOT authentication or session issuance.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const deny = () => { throw new Error("PAY54_ACCOUNT_SESSION_NOT_AUTHORISED"); };

export function validatePay54AccountReadSession({
  sessionFromTrustedAuthority,
  serverTimeMs
} = {}) {
  const s = sessionFromTrustedAuthority;
  if (!s || typeof s !== "object" || Array.isArray(s) ||
      typeof s.principalId !== "string" || !UUID.test(s.principalId) ||
      typeof s.sessionId !== "string" || !UUID.test(s.sessionId) ||
      s.status !== "ACTIVE" ||
      !Number.isSafeInteger(s.version) || s.version < 1 ||
      !Number.isSafeInteger(s.issuedAtMs) ||
      !Number.isSafeInteger(s.expiresAtMs) ||
      !Number.isSafeInteger(serverTimeMs) ||
      s.issuedAtMs > serverTimeMs ||
      s.expiresAtMs <= serverTimeMs ||
      s.expiresAtMs <= s.issuedAtMs) deny();

  return Object.freeze({
    schema: "pay54.account-read-session-preflight.v1",
    principalId: s.principalId.toLowerCase(),
    sessionId: s.sessionId.toLowerCase(),
    sessionVersion: s.version,
    authenticatedByTrustedResolver: true,
    membershipAndRlsStillRequired: true,
    accountSwitchCompleted: false
  });
}
