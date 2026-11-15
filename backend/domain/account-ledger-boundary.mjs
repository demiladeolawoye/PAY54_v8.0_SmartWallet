"use strict";

/* PAY54 Batch 01 / Account scoped financial read contract.
 * Assertions only. No actual ledger or wallet mutation. A transaction service
 * must enforce this with authenticated backend reads and PostgreSQL controls. */

import { validateAccountDescriptor } from "./account-model.mjs";
import { authorizeAccountContext } from "./account-membership.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertScopedFinancialRead({ principalId, account, membership, wallet, journal }) {
  const a = validateAccountDescriptor(account);
  if (!authorizeAccountContext({ principalId, account: a, membership, operation: "view" })) {
    throw new Error("ACCOUNT_ACCESS_DENIED");
  }
  if (!wallet || typeof wallet !== "object" || !UUID.test(wallet.id) || !UUID.test(wallet.accountId) ||
      wallet.accountId.toLowerCase() !== a.accountId) throw new Error("WALLET_SCOPE_DENIED");
  if (journal !== undefined && journal !== null) {
    if (typeof journal !== "object" || !UUID.test(journal.id) || !UUID.test(journal.accountId) ||
      journal.accountId.toLowerCase() !== a.accountId) throw new Error("JOURNAL_SCOPE_DENIED");
  }
  return Object.freeze({ accountId: a.accountId, walletId: wallet.id.toLowerCase(),
    journalId: journal ? journal.id.toLowerCase() : null, scopeVerified: true });
}

export function assertAccountTransferBoundary(fromAccount, toAccount, initiatedBy, fromMembership) {
  const source = validateAccountDescriptor(fromAccount);
  const destination = validateAccountDescriptor(toAccount);
  if (!authorizeAccountContext({
    principalId: initiatedBy, account: source, membership: fromMembership, operation: "initiate"
  })) throw new Error("SOURCE_ACCOUNT_ACCESS_DENIED");
  if (source.accountId === destination.accountId) throw new Error("SAME_ACCOUNT_NOT_A_TRANSFER");
  return Object.freeze({
    sourceAccountId: source.accountId, destinationAccountId: destination.accountId,
    requiresTrustedPostingService: true, executionAuthorised: false
  });
}
