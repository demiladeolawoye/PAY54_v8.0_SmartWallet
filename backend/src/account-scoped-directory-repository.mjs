"use strict";

/**
 * PAY54 Batch 21 / 780 — tenant-scoped, read-only account directory port.
 *
 * withScopedReadTransaction is supplied by a provisioned trusted backend.
 * It MUST begin a read-only SQL transaction with FORCE RLS on protected tables,
 * bind the authenticated actor to a transaction-local database security
 * context, and return ONLY actor-scoped account and membership records.
 *
 * This module never opens a database, issues SQL, or grants database rights.
 * It validates the injected transaction contract without falsely claiming
 * that underlying SQL isolation has been deployed or proven.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const deny = () => { throw new Error("PAY54_SCOPED_DIRECTORY_UNAVAILABLE"); };

export function createPay54ScopedDirectoryRepository({ withScopedReadTransaction } = {}) {
  if (typeof withScopedReadTransaction !== "function") deny();

  return Object.freeze({
    async loadPrincipalAccountDirectory(principalId) {
      if (typeof principalId !== "string" || !UUID.test(principalId)) deny();
      const actor = principalId.toLowerCase();
      let result;
      try {
        result = await withScopedReadTransaction(actor, async transaction => {
          if (!transaction || typeof transaction !== "object" ||
              transaction.actorId !== actor ||
              transaction.readOnly !== true ||
              transaction.rlsEnforced !== true ||
              typeof transaction.listAccounts !== "function" ||
              typeof transaction.listMemberships !== "function") deny();

          // The injected transaction is responsible for setting/verifying
          // transaction-local actor identity and database RLS.
          const accounts = await transaction.listAccounts();
          const memberships = await transaction.listMemberships();
          if (!Array.isArray(accounts) || !Array.isArray(memberships)) deny();
          return { accounts, memberships };
        });
      } catch {
        deny();
      }
      if (!result || typeof result !== "object" ||
          !Array.isArray(result.accounts) ||
          !Array.isArray(result.memberships)) deny();
      return Object.freeze({
        accounts: Object.freeze([...result.accounts]),
        memberships: Object.freeze([...result.memberships])
      });
    }
  });
}
