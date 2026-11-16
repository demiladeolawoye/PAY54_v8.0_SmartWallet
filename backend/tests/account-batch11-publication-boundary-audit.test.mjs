"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessPay54PublicationBoundary} from "../governance/pay54-publication-boundary-audit.mjs";

const sha="8cc7a5918125797fe07c572f4238cd31265555d2";
const params=Object.freeze({
 branch:"project-titan",headSha:sha,
 pagesRunId:"43866210121",pagesConclusion:"success",
 workflowInventory:[
  ".github/workflows/pay54-backend-tests.yml",
  ".github/workflows/pay54-account-batch10-source-integration.yml"
 ]
});
test("272: successful GitHub-managed Pages without source workflow remains HIGH risk",()=>{
 const result=assessPay54PublicationBoundary(params);
 assert.equal(result.explicitPagesWorkflowFound,false);
 assert.equal(result.githubManagedPagesMayBeConfigured,true);
 assert.equal(result.pagesWorkflowSucceeded,true);
 assert.equal(result.engineeringBranchPublicationRisk,"HIGH");
 assert.equal(result.pagesSourceVerified,false);
 assert.equal(result.publishedArtefactsVerified,false);
 assert.equal(result.branchProtectionVerified,false);
 assert.equal(result.adminSettingsReviewRequired,true);
 assert.equal(result.deploymentApproved,false);
 assert.equal(result.productionRelease,"BLOCKED");
 assert.equal(result.financialExecutionEnabled,false);
 assert.ok(Object.isFrozen(result));
 assert.ok(Object.isFrozen(result.workflowInventory));
});
test("272: user-supplied release approval is not trusted evidence",()=>{
 const result=assessPay54PublicationBoundary({
  ...params,releaseApprovalVerified:true
 });
 assert.equal(result.callerClaimedApproval,true);
 assert.equal(result.independentlyVerifiedReleaseApproval,false);
 assert.equal(result.deploymentApproved,false);
});
test("272: explicit workflow is not Pages settings approval",()=>{
 const result=assessPay54PublicationBoundary({
  ...params,workflowInventory:[
   ".github/workflows/pay54-pages.yml",
   ".github/workflows/pay54-backend-tests.yml"
  ]
 });
 assert.equal(result.explicitPagesWorkflowFound,true);
 assert.equal(result.githubManagedPagesMayBeConfigured,false);
 assert.equal(result.pagesSourceVerified,false);
 assert.equal(result.deploymentApproved,false);
});
test("272: invalid source evidence, duplicate paths and crafted workflow paths deny",()=>{
 for(const patch of [
  {branch:"main"},{headSha:"bad"},
  {workflowInventory:null},
  {workflowInventory:["../../secrets.yml"]},
  {workflowInventory:[".github/workflows/deploy.yml",".github/workflows/deploy.yml"]},
  {workflowInventory:[".github/workflows/evil.yml
on: write"]}
 ]){
  assert.throws(()=>assessPay54PublicationBoundary({...params,...patch}),
   /PAY54_PUBLICATION_INVENTORY_UNTRUSTED/);
 }
});
test("272: cancelled Pages job cannot be mistaken for proven publication",()=>{
 const result=assessPay54PublicationBoundary({
  ...params,pagesConclusion:"cancelled"
 });
 assert.equal(result.pagesWorkflowSucceeded,false);
 assert.equal(result.engineeringBranchPublicationRisk,"UNRESOLVED");
 assert.equal(result.productionRelease,"BLOCKED");
});
