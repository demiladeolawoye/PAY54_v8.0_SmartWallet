"use strict";
/** PAY54 Batch 27 / 1172 — cross-provider payout replay/idempotency review. */
const HASH=/^[a-f0-9]{64}$/;
const deny=()=>{throw Error("PAY54_PAYOUT_IDEMPOTENCY_DENIED");};
export function inspectPay54PayoutIdempotency({
 instructionDigest,primaryProviderReference,
 secondaryProviderReference,primaryStatus,
 secondaryStatus,sameIdempotencyKeyReused
}={}){
 if(!HASH.test(instructionDigest??"")||
    !["PENDING","FAILED","SETTLED","UNKNOWN"].includes(primaryStatus)||
    !["NOT_SUBMITTED","PENDING","FAILED","SETTLED","UNKNOWN"].includes(secondaryStatus)||
    !HASH.test(primaryProviderReference??"")||
    (secondaryStatus!=="NOT_SUBMITTED" &&
     !HASH.test(secondaryProviderReference??"")) ||
    typeof sameIdempotencyKeyReused!=="boolean")deny();
 const bothSettled=primaryStatus==="SETTLED" &&
   secondaryStatus==="SETTLED";
 return Object.freeze({
  schema:"pay54.cross-provider-payout-idempotency.v1",
  duplicateSettlementIndicated:bothSettled,
  failoverWhilePrimaryUncertainProhibited:
   primaryStatus==="UNKNOWN"&&secondaryStatus!=="NOT_SUBMITTED",
  sameIdempotencyKeyReused,
  actualPartnerSettlementIndependentlyReconciled:false,
  retryOrCompensatingPaymentAuthorised:false,
  ledgerPostingAuthorised:false
 });
}
