"use strict";

/**
 * PAY54 item 463 — production release exception register evidence validation.
 * P0 security and financial gates are NEVER eligible for exception bypass.
 * This module does not implement an exception approval or deployment action.
 */
const BLOCKED=Object.freeze(new Set([
 "PAGES_SOURCE","PAGES_ARTIFACT","PUBLIC_REACHABILITY",
 "SECRETS_AND_CDN","BRANCH_AND_DEPLOYER",
 "FOUNDER_SECURITY_RELEASE_APPROVAL","TENANT_ISOLATION",
 "REGULATORY_AUTHORISATION","FINANCIAL_LEDGER_INTEGRITY"
]));
const SHA=/^[0-9a-f]{40}$/;
const ID=/^PAY54-CR-[A-Z0-9-]{6,64}$/;
const USER=/^[A-Za-z0-9][A-Za-z0-9._-]{1,63}$/;

export function reviewPay54ReleaseException(input,{now}={}){
 if(!input||typeof input!=="object"||Array.isArray(input)){
  throw new TypeError("PAY54_RELEASE_EXCEPTION_REQUIRED");
 }
 const time=typeof now==="string"?Date.parse(now):NaN;
 if(!Number.isFinite(time))throw new Error("PAY54_RELEASE_EXCEPTION_TIME_REQUIRED");
 const findings=[];
 if(!ID.test(input.changeRequestId??""))findings.push("INVALID_CHANGE_REFERENCE");
 if(!SHA.test(input.commitSha??""))findings.push("INVALID_COMMIT");
 if(typeof input.gate!=="string"||!input.gate.trim()||input.gate.length>80){
  findings.push("INVALID_GATE");
 }else if(BLOCKED.has(input.gate)){
  findings.push("NON_WAIVABLE_GATE");
 }
 if(input.severity!=="LOW"&&input.severity!=="MEDIUM"){
  findings.push("UNACCEPTABLE_SEVERITY");
 }
 if(typeof input.reason!=="string"||input.reason.trim().length<20||
  input.reason.length>2000){
  findings.push("INSUFFICIENT_RISK_JUSTIFICATION");
 }
 if(typeof input.compensatingControl!=="string"||
  input.compensatingControl.trim().length<20||
  input.compensatingControl.length>2000){
  findings.push("COMPENSATING_CONTROL_UNVERIFIED");
 }
 if(!USER.test(input.owner??"")||!USER.test(input.securityReviewer??"")||
  !USER.test(input.releaseReviewer??"")||
  new Set([input.owner,input.securityReviewer,input.releaseReviewer]).size!==3){
  findings.push("INDEPENDENT_APPROVERS_REQUIRED");
 }
 const expiry=Date.parse(input.expiresAt);
 if(typeof input.expiresAt!=="string"||!Number.isFinite(expiry)||
  expiry<=time||expiry-time>7*86400000){
  findings.push("INVALID_EXCEPTION_EXPIRY");
 }
 return Object.freeze({
  schema:"pay54.release-exception-policy.v1",
  findings:Object.freeze(findings),
  eligibleForIndependentReview:findings.length===0,
  actualRiskAcceptanceVerified:false,
  exceptionActivated:false,
  releaseAuthorised:false,
  productionRelease:"BLOCKED"
 });
}
