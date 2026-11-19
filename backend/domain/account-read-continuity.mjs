"use strict";

/**
 * PAY54 Batch 21 / 789 — account read-session continuity fence.
 *
 * The same trusted session authority MUST be queried again after any
 * asynchronous account-directory read. A session rotated, revoked, expired
 * or switched concurrently must not cause its previous account records to
 * be returned to a browser. This pure contract is not an authentication
 * provider, a database RLS substitute or an account-switch operation.
 */
import { validatePay54AccountReadSession }
  from "./account-read-session.mjs";

const deny = () => {
  throw new Error("PAY54_ACCOUNT_READ_CONTINUITY_DENIED");
};

export function validatePay54AccountReadContinuity({
  initialSession,
  latestSession,
  initialServerTimeMs,
  latestServerTimeMs
} = {}) {
  let first, last;
  try {
    first = validatePay54AccountReadSession({
      sessionFromTrustedAuthority: initialSession,
      serverTimeMs: initialServerTimeMs
    });
    last = validatePay54AccountReadSession({
      sessionFromTrustedAuthority: latestSession,
      serverTimeMs: latestServerTimeMs
    });
  } catch {
    deny();
  }
  if (latestServerTimeMs < initialServerTimeMs ||
      first.principalId !== last.principalId ||
      first.sessionId !== last.sessionId ||
      first.sessionVersion !== last.sessionVersion ||
      // Bound the actual authority's freshness of the session, not only its ID.
      initialSession.issuedAtMs !== latestSession.issuedAtMs ||
      initialSession.expiresAtMs !== latestSession.expiresAtMs ||
      (initialSession.activeAccountId ?? null) !==
        (latestSession.activeAccountId ?? null)) {
    deny();
  }

  return Object.freeze({
    schema: "pay54.account-read-continuity.v1",
    principalId: first.principalId,
    sessionId: first.sessionId,
    sessionVersion: first.sessionVersion,
    continuousAtReadBoundary: true,
    accountSwitchCompleted: false,
    productionReady: false
  });
}
