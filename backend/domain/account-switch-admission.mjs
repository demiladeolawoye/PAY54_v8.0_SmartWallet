"use strict";

/**
 * PAY54 Batch 21 / 804 — consolidated account switch admission contract.
 *
 * It composes canonical request validation, server-sourced membership,
 * trusted session eligibility, CSRF and existing session rebind planning.
 * It NEVER performs a switch; a future backend needs an atomic one-time
 * nonce/session-generation compare-and-swap, old-session revocation and RLS
 * rebinding before releasing a switched account or financial data.
 */
import { parsePay54AccountSwitchRequest } from "./account-switch-request.mjs";
import { validatePay54AccountSwitchCsrf } from "./account-switch-csrf.mjs";
import { validatePay54AccountReadSession } from "./account-read-session.mjs";
import { proposePay54AccountSelection } from "./account-context-selection.mjs";
import { planPay54TrustedAccountRebind } from "./account-context-rebind.mjs";

const deny = () => { throw new Error("PAY54_ACCOUNT_SWITCH_ADMISSION_DENIED"); };

export function planPay54AccountSwitchAdmission({
  untrustedRequestPayload,
  trustedApplicationOrigin,
  requestOrigin,
  csrfFromTrustedSession,
  csrfPresentedByRequest,
  currentSessionFromTrustedStore,
  accountFromTrustedStore,
  membershipFromTrustedStore,
  authoritativeSessionVersion,
  serverTimeMs
} = {}) {
  try {
    const request = parsePay54AccountSwitchRequest(untrustedRequestPayload);
    validatePay54AccountSwitchCsrf({
      trustedApplicationOrigin,
      requestOrigin,
      csrfFromTrustedSession,
      csrfPresentedByRequest
    });
    const actor = validatePay54AccountReadSession({
      sessionFromTrustedAuthority: currentSessionFromTrustedStore,
      serverTimeMs
    });
    const selection = proposePay54AccountSelection({
      authenticatedPrincipalId: actor.principalId,
      requestedAccountId: request.requestedAccountId,
      accountFromTrustedStore,
      membershipFromTrustedStore
    });
    const rebind = planPay54TrustedAccountRebind({
      selectionProposal: selection,
      currentSessionFromTrustedStore,
      serverTimeMs,
      authoritativeSessionVersion
    });
    if (rebind.expectedSessionVersion !== actor.sessionVersion ||
        rebind.candidateAccountId !== request.requestedAccountId) deny();

    return Object.freeze({
      schema: "pay54.account-switch-admission.v1",
      principalId: actor.principalId,
      fromSessionId: actor.sessionId,
      expectedSessionVersion: actor.sessionVersion,
      requestedAccountId: request.requestedAccountId,
      requiresAtomicOneTimeReplayFence: true,
      requiresFreshCsrfAndSession: true,
      requiresOldSessionRevocation: true,
      requiresTenantRlsRebind: true,
      requiresDurableAudit: true,
      financialExecutionAuthorised: false,
      switchExecuted: false,
      productionReady: false
    });
  } catch {
    deny();
  }
}
