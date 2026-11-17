"use strict";
/** Batch27/1118 — no expired or not-yet-effective regulated partner contract. */
const deny=()=>{throw Error("PAY54_REGULATED_CONTRACT_WINDOW_DENIED");};
export function inspectPay54PartnerContractWindow({
 effectiveFromMs,effectiveUntilMs,observedAtMs,
 providerRole
}={}){
 if(!["uk-inbound","global-fx-backbone","ng-primary-payout",
  "ng-secondary-payout","linked-card-psp"].includes(providerRole) ||
    !Number.isSafeInteger(effectiveFromMs) ||
    !Number.isSafeInteger(effectiveUntilMs) ||
    !Number.isSafeInteger(observedAtMs) ||
    effectiveFromMs<=0||effectiveFromMs>=effectiveUntilMs ||
    observedAtMs<=0)deny();
 return Object.freeze({
  schema:"pay54.partner-contract-time-window.v1",providerRole,
  currentContractDateWindowValid:
   effectiveFromMs<=observedAtMs && effectiveUntilMs>observedAtMs,
  documentSignaturesIndependentlyVerified:false,
  actualContractTermsReviewed:false,
  safeguardingArrangementVerified:false,
  moneyMovementAuthorised:false
 });
}
