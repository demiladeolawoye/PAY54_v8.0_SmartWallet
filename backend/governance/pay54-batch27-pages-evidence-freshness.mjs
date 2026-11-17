"use strict";
/** Batch27/1072 — no stale, future or cross-SHA release evidence. */
const SHA=/^[0-9a-f]{40}$/;
const deny=()=>{throw new Error("PAY54_EVIDENCE_FRESHNESS_DENIED");};
export function reviewPay54OperationalEvidenceFreshness({
 expectedSha,evidenceSha,
 collectedAtMs,independentlyObservedAtMs,
 maxAgeMs=3600000,serverNowMs=Date.now()
}={}){
 if(!SHA.test(expectedSha??"")||evidenceSha!==expectedSha ||
    !Number.isSafeInteger(collectedAtMs)||collectedAtMs<=0 ||
    !Number.isSafeInteger(independentlyObservedAtMs) ||
    independentlyObservedAtMs<collectedAtMs ||
    !Number.isSafeInteger(serverNowMs)||serverNowMs<=0 ||
    !Number.isSafeInteger(maxAgeMs)||maxAgeMs<1||maxAgeMs>3600000 ||
    serverNowMs<independentlyObservedAtMs ||
    serverNowMs-collectedAtMs>maxAgeMs)deny();
 return Object.freeze({
  schema:"pay54.operational-evidence-freshness.v1",
  expectedSha,observedWithinPermittedAge:true,
  observationAndCollectionOrderingValid:true,
  evidenceIndependentlyAuthenticated:false,
  stagingProvisioningAuthorised:false,
  productionReleaseAuthorised:false
 });
}
