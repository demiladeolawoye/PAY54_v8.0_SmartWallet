"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {
 PAY54_ACCOUNT_CUTOVER_REQUIREMENTS,assessPay54AccountCutoverEvidence
} from "../governance/pay54-account-cutover-evidence.mjs";
const commitSha="b".repeat(40);
function evidence(){
 return PAY54_ACCOUNT_CUTOVER_REQUIREMENTS.map((check,i)=>({
  check,result:"PASS",commitSha,independentSecurityReview:true,
  integrationRunId:"PAY54-AUTH-INTEGRATION-"+String(i).padStart(4,"0")
 }));
}
test("507: complete account cutover metadata never enables customer switching",()=>{
 const r=assessPay54AccountCutoverEvidence({commitSha,evidence:evidence()});
 assert.equal(r.metadataComplete,true);
 assert.equal(r.contextSwitchEnabled,false);
 assert.equal(r.customerTenantIsolationProven,false);
 assert.equal(r.liveBackendTrustVerified,false);
 assert.equal(r.productionRelease,"BLOCKED");
});
test("507: missing cross-tenant deny and RLS proof block switching",()=>{
 const entries=evidence().filter(x=>
  x.check!=="POSTGRES_ROW_LEVEL_SECURITY"&&x.check!=="CROSS_TENANT_DENY_TEST");
 const r=assessPay54AccountCutoverEvidence({commitSha,evidence:entries});
 assert.equal(r.metadataComplete,false);
 assert.ok(r.findings.some(x=>x.check==="CROSS_TENANT_DENY_TEST"));
});
test("507: negative auth and replay regressions must have security review",()=>{
 const entries=evidence();
 entries[0].result="FAIL";
 entries[3].independentSecurityReview=false;
 const r=assessPay54AccountCutoverEvidence({commitSha,evidence:entries});
 assert.equal(r.metadataComplete,false);
 assert.ok(r.findings.some(x=>x.check==="AUTHENTICATED_ACTOR"));
 assert.ok(r.findings.some(x=>x.check==="SESSION_REPLAY_FENCE"));
});
test("507: duplicate or mismatched acceptance run cannot bypass cutover",()=>{
 const entries=evidence();
 entries.push({...entries[0]});
 entries[1].commitSha="c".repeat(40);
 const r=assessPay54AccountCutoverEvidence({commitSha,evidence:entries});
 assert.ok(r.findings.some(x=>x.reason==="DUPLICATE_CHECK"));
 assert.ok(r.findings.some(x=>x.reason==="ACCEPTANCE_NOT_VERIFIED"));
});
