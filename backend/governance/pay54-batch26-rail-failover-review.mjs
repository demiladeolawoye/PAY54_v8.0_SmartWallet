"use strict";
/** Batch26/1045 — segregated Nigeria payout failover contract review. */
const ID=/^[a-z][a-z0-9.-]{4,95}$/;
const deny=()=>{throw Error("PAY54_NG_PAYOUT_FAILOVER_REVIEW_DENIED");};
export function inspectPay54NigeriaFailoverContract({
 primaryProviderId,secondaryProviderId,
 allowNonIdempotentRetry,settlementReconciliationRequired,
 crossRailReferenceMappingDocumented
}={}){
 if(!ID.test(primaryProviderId??"") ||
    !ID.test(secondaryProviderId??"") ||
    primaryProviderId===secondaryProviderId ||
    allowNonIdempotentRetry!==false ||
    settlementReconciliationRequired!==true ||
    crossRailReferenceMappingDocumented!==true)deny();
 return Object.freeze({
  schema:"pay54.ng-payout-failover-source-contract-v1",
  distinctProvidersRequired:true,
  nonIdempotentRetryForbidden:true,
  reconciliationRequired:true,
  actualProviderRedundancyTested:false,
  partnerOutageEvidenceIndependentlyVerified:false,
  paymentExecutionAuthorised:false
 });
}
