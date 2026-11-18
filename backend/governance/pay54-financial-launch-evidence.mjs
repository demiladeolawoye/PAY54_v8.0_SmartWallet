"use strict";

/**
 * PAY54 item 503 — source-only financial production launch evidence gate.
 * Verifies owner-supplied, per-commit acceptance metadata; does not move
 * money, grant permissions, authenticate reviewers or authorise launch.
 */
const SHA=/^[a-f0-9]{40}$/;
const KEY=/^PAY54-LAUNCH-[A-Z0-9-]{8,64}$/;
const GATES=Object.freeze([
 "POSTGRES_TENANT_RLS",
 "ACTOR_SESSION_BOUNDARY",
 "ATOMIC_LEDGER_INTEGRITY",
 "KYC_AML_REGULATORY_SIGNOFF",
 "CUSTOMER_FUNDS_SAFEGUARDING",
 "UK_NIGERIA_PARTNER_AUTHORISATION",
 "FX_EXECUTION_AND_RECONCILIATION",
 "FRAUD_SANCTIONS_SCREENING",
 "INCIDENT_SUPPORT_AND_DISPUTES",
 "FOUNDERS_SECURITY_RELEASE_SIGNOFF"
]);
export const PAY54_FINANCIAL_LAUNCH_GATES=GATES;
export function assessPay54FinancialLaunchEvidence({
 commitSha,checks
}={}){
 if(!SHA.test(commitSha??"")){
  throw new TypeError("PAY54_FINANCIAL_LAUNCH_COMMIT_REQUIRED");
 }
 const items=Array.isArray(checks)&&checks.length<=100?checks:[];
 const findings=[],seen=new Set();
 for(const item of items){
  if(!item||!GATES.includes(item.gate)){
   findings.push({gate:"UNKNOWN",reason:"UNRECOGNISED_EVIDENCE"});continue;
  }
  if(seen.has(item.gate)){
   findings.push({gate:item.gate,reason:"DUPLICATE_EVIDENCE"});continue;
  }
  seen.add(item.gate);
  if(item.status!=="PASS"||item.commitSha!==commitSha||
   !KEY.test(item.evidenceId??"")||
   item.independentSecurityReview!==true){
   findings.push({gate:item.gate,reason:"NOT_INDEPENDENTLY_APPROVED"});
  }
 }
 for(const gate of GATES){
  if(!seen.has(gate))findings.push({gate,reason:"MISSING_EVIDENCE"});
 }
 return Object.freeze({
  schema:"pay54.financial-launch-gate-review.v1",
  requiredGates:GATES,
  findings:Object.freeze(findings.map(x=>Object.freeze(x))),
  suppliedMetadataComplete:findings.length===0,
  contractsActuallyVerified:false,
  regulatedStatusIndependentlyVerified:false,
  tenantDatabaseIndependentlyVerified:false,
  realMoneyModeEnabled:false,
  releaseAuthorised:false,
  productionRelease:"BLOCKED"
 });
}
