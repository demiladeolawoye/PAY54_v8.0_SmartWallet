"use strict";
/** PAY54 Batch 27 / 1170 — server FX quote time/precision and fee evidence. */
const CUR=new Set(["GBP","NGN","USD","EUR","GHS","KES"]);
const ID=/^[a-z0-9._:-]{6,128}$/i;
const deny=()=>{throw Error("PAY54_FX_QUOTE_INTEGRITY_DENIED");};
export function inspectPay54FxQuoteIntegrity({
 fromCurrency,toCurrency,
 quoteReference,rateNumerator,rateDenominator,
 feeMinor,expiresAtMs,nowMs
}={}){
 if(!CUR.has(fromCurrency)||!CUR.has(toCurrency)||
    fromCurrency===toCurrency ||
    !ID.test(quoteReference??"")||
    !/^[1-9][0-9]{0,17}$/.test(rateNumerator??"") ||
    !/^[1-9][0-9]{0,17}$/.test(rateDenominator??"") ||
    !/^(?:0|[1-9][0-9]{0,17})$/.test(feeMinor??"") ||
    !Number.isSafeInteger(expiresAtMs) ||
    !Number.isSafeInteger(nowMs)||nowMs<=0)deny();
 return Object.freeze({
  schema:"pay54.fx-quote-source-integrity.v1",
  fromCurrency,toCurrency,
  rationalRateBasis:true,
  quoteNotExpired:expiresAtMs>nowMs,
  partnerSpotRateIndependentlyChecked:false,
  feeDisclosureIndependentlyApproved:false,
  realMoneyFxExecutionAuthorised:false
 });
}
