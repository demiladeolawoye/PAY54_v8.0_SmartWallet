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

const deny = () => { throw new Error("PAY54_ACCOUNT_DIRECTORY_SERVICE_UNAVAILABLE"); };

export function createPay54AccountDirectoryService({
  resolveAuthenticatedSession,
  loadPrincipalAccountDirectory
} = {}) {
  if (typeof resolveAuthenticatedSession !== "function" ||
      typeof loadPrincipalAccountDirectory !== "function") deny();

  return Object.freeze({
    async listAuthorisedAccounts(requestContext) {
      // Resolve the principal on the server before making any account query.
      let session;
      try {
        session = await resolveAuthenticatedSession(requestContext);
      } catch {
        deny();
      }
      if (!session || session.status !== "ACTIVE" ||
          typeof session.principalId !== "string") deny();

      let records;
      try {
        records = await loadPrincipalAccountDirectory(session.principalId);
      } catch {
        deny();
      }
      if (!records || typeof records !== "object" ||
          Array.isArray(records)) deny();
      // Database readers must be independently scoped to this principal and
      // enforce tenant RLS. The domain projection revalidates all rows.
      try {
        return projectPay54AuthorisedAccountDirectory({
          authenticatedPrincipalId: session.principalId,
          accountsFromTrustedStore: records.accounts,
          membershipsFromTrustedStore: records.memberships
        });
      } catch {
        deny();
      }
    }
  });
}
