"use strict";

/**
 * PAY54 Batch 21 / 794 — active-account financial read eligibility fence.
 *
 * Complements the canonical account-ledger-boundary; does not replace it.
 * Browser-selected IDs are NEVER accepted as evidence of the active account.
 * The trusted session, account and membership are validated together before
 * a future server wallet read may be requested. No financial reads execute.
 */
import { validatePay54AccountReadSession } from "./account-read-session.mjs";
import { validateAccountDescriptor } from "./account-model.mjs";
import { validateAccountMembership, authorizeAccountContext }
  from "./account-membership.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const deny = () => { throw new Error("PAY54_ACTIVE_ACCOUNT_READ_DENIED"); };

export function planPay54ActiveAccountRead({
  sessionFromTrustedAuthority,
  accountFromTrustedStore,
  membershipFromTrustedStore,
  serverTimeMs
} = {}) {
  let session, account, membership;
  try {
    session = validatePay54AccountReadSession({
      sessionFromTrustedAuthority, serverTimeMs
    });
    account = validateAccountDescriptor(accountFromTrustedStore);
    membership = validateAccountMembership(membershipFromTrustedStore);
  } catch {
    deny();
  }

  const sessionAccountId = sessionFromTrustedAuthority.activeAccountId;
  if (typeof sessionAccountId !== "string" || !UUID.test(sessionAccountId) ||
      sessionAccountId.toLowerCase() !== account.accountId ||
      membership.accountId !== account.accountId ||
      membership.principalId !== session.principalId ||
      !authorizeAccountContext({
        principalId: session.principalId,
        account, membership, operation: "view"
      })) deny();

  return Object.freeze({
    schema: "pay54.active-account-read-plan.v1",
    principalId: session.principalId,
    accountId: account.accountId,
    sessionId: session.sessionId,
    sessionVersion: session.sessionVersion,
    authorisedOperation: "view",
    requiresRlsBoundRead: true,
    requiresSessionContinuityCheck: true,
    financialExecutionAuthorised: false,
    readExecuted: false,
    productionReady: false
  });
}
