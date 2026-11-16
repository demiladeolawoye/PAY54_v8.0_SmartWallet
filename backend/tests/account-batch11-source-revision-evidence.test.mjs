"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessPay54SourceRevisionEvidence} from "../governance/pay54-source-revision-evidence.mjs";

const current="98a34df32efdf8d278b5532c02bfeeaccc4c7412";
const older="9f819ac1a0eb965b4570514ab2de5b044a010a0f";
const names=[
 "PAY54 Backend Tests","PAY54 Account Boundary Tests",
 "PAY54 Account Security Integration","PAY54 Account Read Access Integration",
 "PAY54 Account Authentication and RLS Integration",
 "PAY54 Batch 10 Synthetic Role and Audit Source Tests"
];
const successes=(sha)=>names.map((name,i)=>({
 name,id:43865912347+i,headSha:sha,conclusion:"success"
}));
test("274: exact SHA evidence can pass but can never authorise release",()=>{
 const report=assessPay54SourceRevisionEvidence({
  expectedSha:current,workflowRuns:successes(current)
 });
 assert.equal(report.passingOnExactRevision,6);
 assert.equal(report.sourceRegressionComplete,true);
 assert.equal(report.deploymentApproved,false);
 assert.equal(report.customerDataAccessEnabled,false);
 assert.equal(report.financialExecutionEnabled,false);
 assert.equal(report.productionRelease,"BLOCKED");
 assert.ok(Object.isFrozen(report.workflowEvidence));
});
test("274: prior commit success cannot be inherited by newer source",()=>{
 const report=assessPay54SourceRevisionEvidence({
  expectedSha:current,workflowRuns:successes(older)
 });
 assert.equal(report.passingOnExactRevision,0);
 assert.equal(report.sourceRegressionComplete,false);
});
test("274: missing, failed and pending workflow evidence blocks completion",()=>{
 for(const evidence of [
  successes(current).slice(1),
  successes(current).map((run,i)=>i===0?{...run,conclusion:"failure"}:run),
  successes(current).map((run,i)=>i===3?{...run,conclusion:"pending"}:run)
 ]){
  const result=assessPay54SourceRevisionEvidence({
   expectedSha:current,workflowRuns:evidence
  });
  assert.equal(result.sourceRegressionComplete,false);
  assert.equal(result.passingOnExactRevision,5);
 }
});
test("274: forged run metadata is refused before assessment",()=>{
 for(const entry of [
  {...successes(current)[0],id:0},
  {...successes(current)[0],headSha:"main"},
  {...successes(current)[0],conclusion:"approved"},
  {...successes(current)[0],name:null}
 ]){
  assert.throws(()=>assessPay54SourceRevisionEvidence({
   expectedSha:current,workflowRuns:[entry]
  }),/PAY54_RELEASE_EVIDENCE_INVALID/);
 }
});
