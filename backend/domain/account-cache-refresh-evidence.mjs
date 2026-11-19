"use strict";

/**
 * PAY54 Batch 21 / 808 — account-cache transition evidence verifier.
 *
 * Evidence must come from independently instrumented client/server QA,
 * never from an untrusted UI as permission to switch. This module checks
 * completeness only; it does not clear caches or certify live data isolation.
 */
import { PAY54_ACCOUNT_CONTEXT_CACHE_DOMAINS }
  from "./account-context-cache-plan.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const deny = () => { throw new Error("PAY54_ACCOUNT_CACHE_EVIDENCE_INVALID"); };

export function assessPay54AccountCacheRefreshEvidence({
  fromAccountId,
  toAccountId,
  abortedOldRequests,
  clearedDomains,
  verifiedFreshReads
} = {}) {
  if (!UUID.test(fromAccountId ?? "") || !UUID.test(toAccountId ?? "") ||
      fromAccountId.toLowerCase() === toAccountId.toLowerCase() ||
      abortedOldRequests !== true ||
      !Array.isArray(clearedDomains) ||
      !Array.isArray(verifiedFreshReads)) deny();

  const domains = PAY54_ACCOUNT_CONTEXT_CACHE_DOMAINS;
  const complete = values =>
    values.length === domains.length &&
    values.every(v => typeof v === "string") &&
    new Set(values).size === domains.length &&
    domains.every(v => values.includes(v));

  if (!complete(clearedDomains) || !complete(verifiedFreshReads)) deny();

  return Object.freeze({
    schema: "pay54.account-cache-evidence-assessment.v1",
    fromAccountId: fromAccountId.toLowerCase(),
    toAccountId: toAccountId.toLowerCase(),
    evaluatedDomains: Object.freeze([...domains]),
    evidenceCompleteForReview: true,
    requiresIndependentLiveIsolationProof: true,
    requiresServerConfirmedSessionRebind: true,
    accountSwitchCompleted: false,
    productionReady: false
  });
}
