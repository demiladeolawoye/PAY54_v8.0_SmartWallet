"use strict";

/**
 * PAY54 CR-PAYTAG-01 P2B-B1 — server-only registration admission boundary.
 *
 * Admission is NOT authorisation to claim, register, resolve or pay any tag.
 * No database transaction, privilege, HTTP route or production flag exists here.
 * A future restricted PostgreSQL executor must revalidate the session and
 * ownership under locks in the SAME transaction as the registry mutation.
 */
import { normalisePay54PayTag } from "./paytag-identity-contract.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000;
const CLOCK_SKEW_MS = 60_000;
const deny = () => { throw new Error("PAY54_PAYTAG_ADMISSION_DENIED"); };
const isUUID = x => typeof x === "string" && UUID.test(x);
const exactFields = (value, names) =>
  value !== null && typeof value === "object" && !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype &&
  Object.keys(value).length === names.length &&
  names.every(n => Object.prototype.hasOwnProperty.call(value, n));

export const PAY54_PAYTAG_ADMISSION_POSTURE = Object.freeze({
  schema: "pay54.paytag.registration-admission.v1",
  sourceOnly: true,
  registryWriteAuthorised: false,
  recipientResolutionAuthorised: false,
  financialExecutionEnabled: false,
  httpRouteEnabled: false,
  productionRelease: "BLOCKED"
});

/**
 * Trust root: supplied only by the backend's trusted bootstrap.
 * The resolver authenticates the bearer credential server-side.
 * Input payload accepts ONLY { proposedTag }; client-supplied account, wallet,
 * actor, session, approval and privilege fields are rejected, never ignored.
 */
export function createPay54PayTagRegistrationAdmission({
  resolveAuthenticatedSession,
  getTrustedServerTimeMs = Date.now
} = {}) {
  if (typeof resolveAuthenticatedSession !== "function" ||
      typeof getTrustedServerTimeMs !== "function") deny();

  return async function admitRegistration({ requestContext, requestPayload } = {}) {
    if (!exactFields(requestPayload, ["proposedTag"]) ||
        !requestContext || typeof requestContext !== "object") deny();
    let alias, session, now;
    try {
      alias = normalisePay54PayTag(requestPayload.proposedTag);
      now = getTrustedServerTimeMs();
      session = await resolveAuthenticatedSession(requestContext);
    } catch {
      deny();
    }
    if (!Number.isSafeInteger(now) ||
        !session || typeof session !== "object" ||
        session.status !== "ACTIVE" ||
        !isUUID(session.sessionId) ||
        !isUUID(session.principalId) ||
        !isUUID(session.activeAccountId) ||
        !Number.isSafeInteger(session.version) || session.version < 1 ||
        !Number.isSafeInteger(session.issuedAtMs) ||
        !Number.isSafeInteger(session.expiresAtMs) ||
        session.issuedAtMs > now + CLOCK_SKEW_MS ||
        session.issuedAtMs < now - SESSION_LIFETIME_MS ||
        session.expiresAtMs <= now + 30_000 ||
        session.expiresAtMs > session.issuedAtMs + SESSION_LIFETIME_MS + CLOCK_SKEW_MS) deny();

    // A time-of-check snapshot, never an authoritative DB write instruction.
    // The future trusted executor must compare all values again inside its
    // serialisable transaction with locked session, membership and wallet.
    return Object.freeze({
      schema: "pay54.paytag.registration-admission.v1",
      canonicalAlias: alias.canonical,
      accountId: session.activeAccountId.toLowerCase(),
      principalId: session.principalId.toLowerCase(),
      sessionId: session.sessionId.toLowerCase(),
      sessionVersion: session.version,
      admissibleForTrustedDatabaseRevalidation: true,
      registryWriteAuthorised: false,
      recipientResolutionAuthorised: false,
      financialExecutionEnabled: false,
      productionRelease: "BLOCKED"
    });
  };
}
