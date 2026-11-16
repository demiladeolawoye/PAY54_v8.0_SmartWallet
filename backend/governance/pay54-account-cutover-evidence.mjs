"use strict";

/**
 * PAY54 item 506 — Personal/Business account cutover safety evidence review.
 * Source-only read of supplied backend acceptance records. It does not perform
 * a context switch, expose customer records, grant a DB role or enable UI.
 */
const SHA=/^[a-f0-9]{40}$/;
const REQUIREMENTS=Object.freeze([
 "AUTHENTICATED_ACTOR",
 "PERSONAL_BUSINESS_OWNERSHIP",
 "POSTGRES_ROW_LEVEL_SECURITY",
 "SESSION_REPLAY_FENCE",
 "CSRF_AND_TOKEN_SCOPE",
 "AUDITED_ACCOUNT_TRANSITION",
 "CROSS_TENANT_DENY_TEST",
 "REVOCATION_AND_LOGOUT",
 "CUSTOMER_CONTEXT_UI_REGRESSION"
]);
export const PAY54_ACCOUNT_CUTOVER_REQUIREMENTS=REQUIREMENTS;
export function assessPay54AccountCutoverEvidence({
 commitSha,evidence
}={}){
 if(!SHA.test(commitSha??"")){
  throw new TypeError("PAY54_ACCOUNT_CUTOVER_COMMIT_REQUIRED");
 }
 const entries=Array.isArray(evidence)&&evidence.length<=50?evidence:[];
 const seen=new Set(),findings=[];
 for(const row of entries){
  if(!row||!REQUIREMENTS.includes(row.check)){
   findings.push({check:"UNKNOWN",reason:"UNSUPPORTED_CHECK"});continue;
  }
  if(seen.has(row.check)){
   findings.push({check:row.check,reason:"DUPLICATE_CHECK"});continue;
  }
  seen.add(row.check);
  if(row.result!=="PASS"||row.commitSha!==commitSha||
   row.independentSecurityReview!==true||
   typeof row.integrationRunId!=="string"||
   !/^PAY54-AUTH-[A-Z0-9-]{6,64}$/.test(row.integrationRunId)){
   findings.push({check:row.check,reason:"ACCEPTANCE_NOT_VERIFIED"});
  }
 }
 for(const check of REQUIREMENTS){
  if(!seen.has(check))findings.push({check,reason:"MISSING_ACCEPTANCE"});
 }
 return Object.freeze({
  schema:"pay54.account-cutover-evidence.v1",
  requiredChecks:REQUIREMENTS,
  findings:Object.freeze(findings.map(x=>Object.freeze(x))),
  metadataComplete:findings.length===0,
  liveBackendTrustVerified:false,
  customerTenantIsolationProven:false,
  contextSwitchEnabled:false,
  productionRelease:"BLOCKED"
 });
}
