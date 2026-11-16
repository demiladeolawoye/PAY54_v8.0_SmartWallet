"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {PAY54_FRONTEND_ACCEPTANCE_CASES,assessPay54FrontendAcceptance}
 from "../governance/pay54-frontend-acceptance-evidence.mjs";
const SHA="a".repeat(40),now="2026-11-16T21:00:00.000Z";
const fixture=()=>({
 commitSha:SHA,
 results:PAY54_FRONTEND_ACCEPTANCE_CASES.map((item,i)=>({
  case:item,status:"PASS",commitSha:SHA,
  executionId:"PAY54-QA-RUN-"+String(i).padStart(6,"0"),
  completedAt:"2026-11-16T20:00:00.000Z",
  deviceOrBrowser:"Synthetic device report metadata"
 }))
});
test("461: supplied frontend coverage can never certify customer journeys",()=>{
 const r=assessPay54FrontendAcceptance(fixture(),{now});
 assert.equal(r.declaredCoverageComplete,true);
 assert.equal(r.customerJourneysCertified,false);
 assert.equal(r.actualDeviceExecutionIndependentlyVerified,false);
 assert.equal(r.productionRelease,"BLOCKED");
});
test("461: missing accessibility or wallet journey fails closed",()=>{
 const f=fixture();f.results=f.results.filter(x=>x.case!=="ACCESSIBILITY_SCREEN_READER");
 const r=assessPay54FrontendAcceptance(f,{now});
 assert.ok(r.findings.some(x=>x.case==="ACCESSIBILITY_SCREEN_READER"&&x.reason==="MISSING_TEST"));
});
test("461: failed, duplicate and mismatched results do not pass",()=>{
 const f=fixture();f.results[0].status="FAIL";
 f.results[1].commitSha="b".repeat(40);
 f.results.push({...f.results[2]});
 const r=assessPay54FrontendAcceptance(f,{now});
 assert.equal(r.declaredCoverageComplete,false);
 assert.ok(r.findings.some(x=>x.reason==="DUPLICATE_TEST"));
});
test("461: future and stale device evidence fail",()=>{
 for(const completedAt of ["2026-11-17T20:00:00Z","2026-10-01T20:00:00Z"]){
  const f=fixture();f.results[0].completedAt=completedAt;
  assert.equal(assessPay54FrontendAcceptance(f,{now}).declaredCoverageComplete,false);
 }
});
