"use strict";
/** PAY54 Batch 27 / 1174 — bound minor-unit refund and chargeback evidence. */
const HASH=/^[a-f0-9]{64}$/;
const deny=()=>{throw Error("PAY54_REFUND_DISPUTE_EVIDENCE_DENIED");};
export function inspectPay54RefundDisputeEvidence({
 originalCaptureDigest,currency,originalMinor,
 refundMinor,chargebackMinor
}={}){
 if(!HASH.test(originalCaptureDigest??"") ||
    !["GBP","NGN","USD","EUR","GHS","KES"].includes(currency)||
    !/^[1-9][0-9]{0,17}$/.test(originalMinor??"")||
    !/^(?:0|[1-9][0-9]{0,17})$/.test(refundMinor??"")||
    !/^(?:0|[1-9][0-9]{0,17})$/.test(chargebackMinor??""))deny();
 const original=BigInt(originalMinor);
 const refunded=BigInt(refundMinor);
 const disputed=BigInt(chargebackMinor);
 return Object.freeze({
  schema:"pay54.refund-dispute-conservation-evidence.v1",
  currency,
  totalClaimWithinCapture:refunded+disputed<=original,
  actualCardNetworkChargebackVerified:false,
  providerDisputeStatusIndependentlyVerified:false,
  customerCreditAuthorised:false,
  productionCardProcessingEnabled:false
 });
}
