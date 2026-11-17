"use strict";

/**
 * PAY54 Batch 21 / 796 — compose active account and existing ledger boundary.
 *
 * This is an admission check for a future trusted read service, NOT a query
 * or a transfer. Both gates must succeed and resolve to exactly the same
 * verified account. The canonical ledger scope remains in account-ledger-
 * boundary.mjs; its rules are not copied into this module.
 */
import { planPay54ActiveAccountRead } from "./account-active-read-scope.mjs";
import { assertScopedFinancialRead } from "./account-ledger-boundary.mjs";

const deny = () => { throw new Error("PAY54_WALLET_READ_ADMISSION_DENIED"); };

export function planPay54AccountWalletRead({
  sessionFromTrustedAuthority,
  accountFromTrustedStore,
  membershipFromTrustedStore,
  serverTimeMs,
  walletFromTrustedStore,
  journalFromTrustedStore
} = {}) {
  let scope, ledger;
  try {
    scope = planPay54ActiveAccountRead({
      sessionFromTrustedAuthority,
      accountFromTrustedStore,
      membershipFromTrustedStore,
      serverTimeMs
    });
    ledger = assertScopedFinancialRead({
      principalId: scope.principalId,
      account: accountFromTrustedStore,
      membership: membershipFromTrustedStore,
      wallet: walletFromTrustedStore,
      journal: journalFromTrustedStore
    });
  } catch {
    deny();
  }
  if (ledger.accountId !== scope.accountId ||
      ledger.scopeVerified !== true) deny();

  return Object.freeze({
    schema: "pay54.account-wallet-read-admission.v1",
    principalId: scope.principalId,
    accountId: scope.accountId,
    sessionId: scope.sessionId,
    sessionVersion: scope.sessionVersion,
    walletId: ledger.walletId,
    journalId: ledger.journalId,
    requiresRlsBoundRead: true,
    requiresSessionContinuityCheck: true,
    financialExecutionAuthorised: false,
    walletReadExecuted: false,
    productionReady: false
  });
}
