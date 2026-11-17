"use strict";

/**
 * PAY54 Batch 21 / 770 — authenticated account directory application service.
 *
 * Composition root must inject server-owned, trusted session and repository
 * implementations. The caller's browser identifier is never an identity
 * authority. No HTTP endpoint is mounted and no session/account is changed.
 */
import { projectPay54AuthorisedAccountDirectory } from
  "../domain/account-context-directory.mjs";
import { validatePay54AccountReadSession } from "../domain/account-read-session.mjs";

const deny = () => { throw new Error("PAY54_ACCOUNT_DIRECTORY_SERVICE_UNAVAILABLE"); };

export function createPay54AccountDirectoryService({
  resolveAuthenticatedSession,
  loadPrincipalAccountDirectory,
  getTrustedServerTimeMs = Date.now
} = {}) {
  if (typeof resolveAuthenticatedSession !== "function" ||
      typeof loadPrincipalAccountDirectory !== "function" ||
      typeof getTrustedServerTimeMs !== "function") deny();

  return Object.freeze({
    async listAuthorisedAccounts(requestContext) {
      // Resolve the principal on the server before making any account query.
      let session;
      try {
        session = await resolveAuthenticatedSession(requestContext);
      } catch {
        deny();
      }
      let authorisedSession;
      try {
        authorisedSession = validatePay54AccountReadSession({
          sessionFromTrustedAuthority: session,
          serverTimeMs: getTrustedServerTimeMs()
        });
      } catch {
        deny();
      }

      let records;
      try {
        records = await loadPrincipalAccountDirectory(authorisedSession.principalId);
      } catch {
        deny();
      }
      if (!records || typeof records !== "object" ||
          Array.isArray(records)) deny();
      // Database readers must be independently scoped to this principal and
      // enforce tenant RLS. The domain projection revalidates all rows.
      try {
        return projectPay54AuthorisedAccountDirectory({
          authenticatedPrincipalId: authorisedSession.principalId,
          accountsFromTrustedStore: records.accounts,
          membershipsFromTrustedStore: records.memberships
        });
      } catch {
        deny();
      }
    }
  });
}
