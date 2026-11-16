"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {assessPay54StagingSourceReadiness}
 from "../governance/pay54-staging-source-readiness.mjs";

const path=".github/workflows/pay54-staging-deploy.yml";
const terraformSource=readFileSync(
 new URL("../../infrastructure/staging/main.tf",import.meta.url),"utf8");
const stagingWorkflowSource=readFileSync(
 new URL("../../"+path,import.meta.url),"utf8");
const source={
 terraformSource,stagingWorkflowSource,
 workflowInventory:[{path,content:stagingWorkflowSource}]
};
test("306: audited staging remains blocked with version-tag dependency gap",()=>{
 const result=assessPay54StagingSourceReadiness(source);
 assert.ok(result.sourceChecks.some(x=>
  x.name==="TERRAFORM_PROVISIONING_DENIAL"&&x.passed));
 assert.ok(result.mutableExternalActionCount>=2);
 assert.equal(result.sourceReadyForIndependentReview,false);
 assert.equal(result.cloudIdentityAttested,false);
 assert.equal(result.independentReviewComplete,false);
 assert.equal(result.stagingApproved,false);
 assert.equal(result.financialExecutionEnabled,false);
 assert.equal(result.productionRelease,"BLOCKED");
 assert.ok(result.openOperationalEvidence.includes(
  "FOUNDER_RELEASE_AUTHORISATION"));
});
test("306: apparent source change authorising WIF or provisioning is detected",()=>{
 for(const terraform of [
  terraformSource.replace("disabled = true","disabled = false"),
  terraformSource.replace("default     = false","default     = true")
 ]){
  assert.notEqual(terraform,terraformSource);
  const result=assessPay54StagingSourceReadiness({
   ...source,terraformSource:terraform
  });
  assert.equal(result.sourceReadyForIndependentReview,false);
  assert.ok(result.sourceChecks.some(x=>!x.passed));
  assert.equal(result.stagingApproved,false);
 }
});
test("306: missing or invalid reviewer inventory cannot return a decision",()=>{
 for(const bad of [
  {...source,terraformSource:"x"},
  {...source,workflowInventory:[]},
  {...source,stagingWorkflowSource:"x"}
 ]){
  assert.throws(()=>assessPay54StagingSourceReadiness(bad));
 }
});
