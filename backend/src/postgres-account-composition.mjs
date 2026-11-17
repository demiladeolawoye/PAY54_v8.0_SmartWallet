"use strict";

/**
 * PAY54 Batch 22 / 828 — executable PostgreSQL account-directory composition.
 *
 * Takes separate, independently provisioned SELECT-only pools: an
 * auth_sessions reader and an account/member reader. Both adapters check
 * actual PostgreSQL role privileges and forced RLS before reading data.
 *
 * Importing/composing does not register HTTP routes, issue sessions or
 * activate Business switching, wallet reads or financial transactions.
 */
import { createPay54AccountDirectoryComposition }
  from "./account-directory-composition.mjs";
import { createPay54PostgresSessionResolver }
  from "./postgres-session-resolver.mjs";
import { createPay54PostgresReadTransaction }
  from "./postgres-account-read-transaction.mjs";

const deny = () => { throw new Error("PAY54_PG_ACCOUNT_COMPOSITION_UNAVAILABLE"); };

export function createPay54PostgresAccountDirectoryComposition({
  sessionReadPool,
  accountReadPool,
  getTrustedServerTimeMs = Date.now
} = {}) {
  if (!sessionReadPool || !accountReadPool ||
      sessionReadPool === accountReadPool ||
      typeof getTrustedServerTimeMs !== "function") deny();

  const resolveAuthenticatedSession = createPay54PostgresSessionResolver({
    pool: sessionReadPool, getTrustedServerTimeMs
  });
  const withScopedReadTransaction = createPay54PostgresReadTransaction({
    pool: accountReadPool
  });

  return createPay54AccountDirectoryComposition({
    resolveAuthenticatedSession,
    withScopedReadTransaction,
    getTrustedServerTimeMs
  });
}
