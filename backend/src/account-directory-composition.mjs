"use strict";

/**
 * PAY54 Batch 21 / 782 — read-only directory composition.
 *
 * Both dependencies are injected by trusted server bootstrap. This factory
 * does not bind any route, instantiate a PostgreSQL client, or establish
 * authentication. Existing /v1/accounts remains unavailable in the
 * foundation server until a separately reviewed operational cutover.
 */
import { createPay54AccountDirectoryService }
  from "./account-directory-service.mjs";
import { createPay54ScopedDirectoryRepository }
  from "./account-scoped-directory-repository.mjs";

export function createPay54AccountDirectoryComposition({
  resolveAuthenticatedSession,
  getTrustedServerTimeMs,
  withScopedReadTransaction
} = {}) {
  const repository = createPay54ScopedDirectoryRepository({
    withScopedReadTransaction
  });
  return createPay54AccountDirectoryService({
    resolveAuthenticatedSession,
    getTrustedServerTimeMs,
    loadPrincipalAccountDirectory: principalId =>
      repository.loadPrincipalAccountDirectory(principalId)
  });
}
