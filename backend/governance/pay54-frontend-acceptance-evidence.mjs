"use strict";

/**
 * PAY54 item 460 — independently supplied frontend acceptance evidence policy.
 * Never claims browser/device automation was executed by this module.
 */
const SHA=/^[a-f0-9]{40}$/;
const COVERAGE=Object.freeze([
 "MOBILE_AUTH","DESKTOP_AUTH","WALLET_NAVIGATION",
 "PERSONAL_BUSINESS_BOUNDARY","ACCESSIBILITY_KEYBOARD",
 "ACCESSIBILITY_SCREEN_READER","ASSET_LOAD","CONTENT_SECURITY",
 "PERFORMANCE_BUDGET","SUPPORT_RECOVERY"
]);
export const PAY54_FRONTEND_ACCEPTANCE_CASES=COVERAGE;

export function assessPay54FrontendAcceptance(input,{now}={}){
 if(!input||typeof input!=="object"||Array.isArray(input)){
  throw new TypeError("PAY54_FRONTEND_ACCEPTANCE_REQUIRED");
 }
 const nowMs=typeof now==="string"?Date.parse(now):NaN;
 if(!Number.isFinite(nowMs))throw new Error("PAY54_FRONTEND_CLOCK_REQUIRED");
 const findings=[];
 if(!SHA.test(input.commitSha??""))findings.push({case:"COMMIT",reason:"INVALID_COMMIT"});
 const cases=Array.isArray(input.results)?input.results:[];
 const seen=new Map();
 for(const result of cases){
  if(!result||!COVERAGE.includes(result.case)){
   findings.push({case:"SCHEMA",reason:"UNEXPECTED_TEST"});continue;
  }
  if(seen.has(result.case)){
   findings.push({case:result.case,reason:"DUPLICATE_TEST"});continue;
  }
  seen.set(result.case,result);
 }
 for(const key of COVERAGE){
  const item=seen.get(key);
  if(!item){findings.push({case:key,reason:"MISSING_TEST"});continue;}
  if(item.status!=="PASS"||item.commitSha!==input.commitSha){
   findings.push({case:key,reason:"FAILED_OR_MISMATCHED_RESULT"});continue;
  }
  if(typeof item.executionId!=="string"||
   !/^PAY54-QA-[A-Z0-9-]{6,64}$/.test(item.executionId)){
   findings.push({case:key,reason:"EVIDENCE_ID_INVALID"});continue;
  }
  const timestamp=Date.parse(item.completedAt);
  if(typeof item.completedAt!=="string"||!Number.isFinite(timestamp)||
   timestamp>nowMs||nowMs-timestamp>7*86400000){
   findings.push({case:key,reason:"INVALID_OR_STALE_EXECUTION"});continue;
  }
  if(typeof item.deviceOrBrowser!=="string"||
   item.deviceOrBrowser.trim().length<3||item.deviceOrBrowser.length>100){
   findings.push({case:key,reason:"DEVICE_CONTEXT_MISSING"});
  }
 }
 return Object.freeze({
  schema:"pay54.frontend-acceptance-evidence.v1",
  requiredCases:COVERAGE,
  evaluatedCases:seen.size,
  findings:Object.freeze(findings.map(x=>Object.freeze(x))),
  declaredCoverageComplete:findings.length===0,
  actualDeviceExecutionIndependentlyVerified:false,
  customerJourneysCertified:false,
  productionRelease:"BLOCKED"
 });
}
