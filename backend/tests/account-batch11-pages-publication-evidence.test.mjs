"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessPay54PagesPublicationEvidence}
 from "../governance/pay54-pages-publication-evidence.mjs";

const sha="9f3348546be673c4c30f23e3fe20ccc147dfdd46";
const runId="43865644521";
const base={
 branch:"project-titan",headSha:sha,runId,
 workflow:"pages build and deployment",conclusion:"success"
};
test("269: existing Pages success is evidence of publication risk, not approval",()=>{
 const result=assessPay54PagesPublicationEvidence(base);
 assert.equal(result.existingWorkflowObserved,true);
 assert.equal(result.publicationMayHaveOccurred,true);
 assert.equal(result.engineeringBranchPublicationRisk,"HIGH");
 assert.equal(result.repositoryPagesSettingsVerified,false);
 assert.equal(result.publishedContentIndependentlyVerified,false);
 assert.equal(result.publicationApproved,false);
 assert.equal(result.deploymentApproved,false);
 assert.equal(result.productionRelease,"BLOCKED");
 assert.equal(result.financialExecutionEnabled,false);
 assert.ok(Object.isFrozen(result));
});
test("269: caller's approval assertions cannot self-authorise publishing",()=>{
 const result=assessPay54PagesPublicationEvidence({
  ...base,sourceConfigurationReviewed:true,
  publishedContentReviewed:true,founderApproved:true
 });
 assert.equal(result.sourceReviewClaimed,true);
 assert.equal(result.contentReviewClaimed,true);
 assert.equal(result.founderApprovalClaimed,true);
 assert.equal(result.repositoryPagesSettingsVerified,false);
 assert.equal(result.publishedContentIndependentlyVerified,false);
 assert.equal(result.founderApprovalIndependentlyVerified,false);
 assert.equal(result.publicationApproved,false);
});
test("269: invalid run, branch, SHA and workflow fail closed",()=>{
 for(const mutation of [
  {branch:"main"},{headSha:"123"},{runId:"0"},{runId:-1},
  {workflow:"deploy production"},{conclusion:"approved"}
 ]){
  assert.throws(()=>assessPay54PagesPublicationEvidence({...base,...mutation}),
   /PAY54_PAGES_EVIDENCE_UNTRUSTED/);
 }
});
test("269: cancelled Pages workflow cannot be asserted as published",()=>{
 const result=assessPay54PagesPublicationEvidence({
  ...base,conclusion:"cancelled"
 });
 assert.equal(result.publicationMayHaveOccurred,false);
 assert.equal(result.publicationApproved,false);
 assert.equal(result.engineeringBranchPublicationRisk,"UNRESOLVED");
});
