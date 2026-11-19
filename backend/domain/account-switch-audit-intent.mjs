"use strict";

/**
 * PAY54 Batch 21 / 806 — minimal redacted audit-intent builder.
 *
 * Emits a non-successful pre-commit event only. The protected, append-only
 * server audit writer must persist its own durable event after the actual
 * future transaction, and must never treat this plan as a completed switch.
 * No CSRF tokens, cookies, balances or payment details enter this record.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const deny = () => { throw new Error("PAY54_ACCOUNT_SWITCH_AUDIT_INTENT_DENIED"); };

export function buildPay54AccountSwitchAuditIntent({
  switchAdmission,
  correlationId,
  serverEventTimeMs
} = {}) {
  if (switchAdmission?.schema !== "pay54.account-switch-admission.v1" ||
      switchAdmission.switchExecuted !== false ||
      switchAdmission.financialExecutionAuthorised !== false ||
      switchAdmission.productionReady !== false ||
      !UUID.test(switchAdmission.principalId ?? "") ||
      !UUID.test(switchAdmission.fromSessionId ?? "") ||
      !UUID.test(switchAdmission.requestedAccountId ?? "") ||
      !Number.isSafeInteger(switchAdmission.expectedSessionVersion) ||
      switchAdmission.expectedSessionVersion < 1 ||
      !UUID.test(correlationId ?? "") ||
      !Number.isSafeInteger(serverEventTimeMs) ||
      serverEventTimeMs <= 0) deny();

  return Object.freeze({
    schema: "pay54.account-switch-audit-intent.v1",
    eventType: "ACCOUNT_CONTEXT_CHANGE_PREPARED",
    outcome: "NOT_COMMITTED",
    principalId: switchAdmission.principalId.toLowerCase(),
    requestedAccountId: switchAdmission.requestedAccountId.toLowerCase(),
    previousSessionId: switchAdmission.fromSessionId.toLowerCase(),
    expectedSessionVersion: switchAdmission.expectedSessionVersion,
    correlationId: correlationId.toLowerCase(),
    eventTimeMs: serverEventTimeMs,
    requiresDurableAppendOnlyAudit: true,
    switchExecuted: false
  });
}
