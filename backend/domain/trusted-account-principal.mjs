"use strict";

/* PAY54 Batch 02 / Trusted principal boundary.
 * No client-supplied profile, cookie contents or header is accepted as identity.
 * A backend session verifier must supply an authenticated, fresh subject.
 * No server is started and no credentials are handled here.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VERIFIED = new WeakSet();

export function createTrustedAccountPrincipalResolver({ verifyServerSession }) {
  if (typeof verifyServerSession !== "function") {
    throw new TypeError("Trusted server session verifier is required");
  }
  return Object.freeze({
    async resolve(request) {
      const session = await verifyServerSession(request);
      if (!session || typeof session !== "object" ||
          session.authenticated !== true || session.revoked !== false ||
          !UUID.test(session.subjectId) || !Number.isSafeInteger(session.expiresAt) ||
          session.expiresAt <= Math.floor(Date.now() / 1000)) {
        throw new Error("ACCOUNT_AUTH_REQUIRED");
      }
      const principal = Object.freeze({ subjectId: session.subjectId.toLowerCase() });
      VERIFIED.add(principal);
      return principal;
    }
  });
}

export function requireTrustedPrincipal(candidate) {
  if (!candidate || typeof candidate !== "object" || !VERIFIED.has(candidate)) {
    throw new Error("ACCOUNT_AUTH_REQUIRED");
  }
  return candidate.subjectId;
}
