"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {
 assessPay54FinancialLaunchEvidence,PAY54_FINANCIAL_LAUNCH_GATES
} from "../governance/pay54-financial-launch-evidence.mjs";
const commitSha="a".repeat(40);
function full(){
 return PAY54_FINANCIAL_LAUNCH_GATES.map((gate,i)=>({
  gate,status:"PASS",commitSha,
  evidenceId:"PAY54-LAUNCH-REVIEW-"+String(i).padStart(4,"0"),
  independentSecurityReview:true
 }));
}
test("504: apparent financial launch evidence completeness never enables money movement",()=>{
 const report=assessPay54FinancialLaunchEvidence({commitSha,checks:full()});
 assert.equal(report.suppliedMetadataComplete,true);
 assert.equal(report.regulatedStatusIndependentlyVerified,false);
 assert.equal(report.tenantDatabaseIndependentlyVerified,false);
 assert.equal(report.realMoneyModeEnabled,false);
 assert.equal(report.releaseAuthorised,false);
 assert.equal(report.productionRelease,"BLOCKED");
});
test("504: missing tenant RLS or safeguarding is an explicit release blocker",()=>{
 const checks=full().filter(x=>x.gate!=="POSTGRES_TENANT_RLS"&&
  x.gate!=="CUSTOMER_FUNDS_SAFEGUARDING");
 const r=assessPay54FinancialLaunchEvidence({commitSha,checks});
 assert.equal(r.suppliedMetadataComplete,false);
 assert.ok(r.findings.some(x=>x.gate==="POSTGRES_TENANT_RLS"));
 assert.ok(r.findings.some(x=>x.gate==="CUSTOMER_FUNDS_SAFEGUARDING"));
});
test("504: unreviewed partner readiness or failed AML cannot be bypassed",()=>{
 const checks=full();
 checks[3].status="FAIL";
 checks[5].independentSecurityReview=false;
 const r=assessPay54FinancialLaunchEvidence({commitSha,checks});
 assert.ok(r.findings.some(x=>x.gate==="KYC_AML_REGULATORY_SIGNOFF"));
 assert.ok(r.findings.some(x=>x.gate==="UK_NIGERIA_PARTNER_AUTHORISATION"));
});
test("504: wrong-commit or duplicate financial evidence is rejected",()=>{
 const checks=full();
 checks[0].commitSha="b".repeat(40);
 checks.push({...checks[1]});
 const r=assessPay54FinancialLaunchEvidence({commitSha,checks});
 assert.ok(r.findings.some(x=>x.reason==="DUPLICATE_EVIDENCE"));
 assert.ok(r.findings.some(x=>x.reason==="NOT_INDEPENDENTLY_APPROVED"));
});
