"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {reviewPay54OfflinePagesCandidate as review}
 from "../governance/pay54-batch25-pages-promotion-boundary.mjs";

const valid={
 artifactDirectory:"/temporary/pay54-static",
 inspectRoot:()=>({sourceRootPublicationBlocked:true}),
 inspectArtifact:()=>({
  candidateDirectoryApprovedForIndependentReview:true,
  deploymentAuthorised:false,remoteArtifactInspected:false,
  fileCount:7
 }),
 inspectFunding:()=>({
  productionCardFundingApproved:false,
  developmentProviderScriptPresent:true
 })
};
test("1004: development provider in source blocks offline Pages candidate",()=>{
 const result=review(valid);
 assert.equal(result.candidateRejectedDueToCardDependency,true);
 assert.equal(result.readyForIndependentNonFinancialPagesReview,false);
 assert.equal(result.deploymentAuthorised,false);
 assert.equal(result.currentPagesArtifactAndSettingsVerified,false);
 assert.ok(Object.isFrozen(result));
});
test("1004: source-only inert build still needs independent Pages verification",()=>{
 const r=review({...valid,inspectFunding:()=>({
  productionCardFundingApproved:false,
  developmentProviderScriptPresent:false
 })});
 assert.equal(r.readyForIndependentNonFinancialPagesReview,true);
 assert.equal(r.deploymentAuthorised,false);
 assert.equal(r.sensitiveHistoryContainmentVerified,false);
});
test("1004: repository root, unsafe static files and claims of financial approval deny",()=>{
 for(const change of [
  {inspectRoot:()=>({sourceRootPublicationBlocked:false})},
  {inspectArtifact:()=>({
   candidateDirectoryApprovedForIndependentReview:false,
   deploymentAuthorised:false,remoteArtifactInspected:false,fileCount:3
  })},
  {inspectFunding:()=>({
   productionCardFundingApproved:true,
   developmentProviderScriptPresent:false
  })}
 ])assert.throws(()=>review({...valid,...change}),
  /PAGES_RELEASE_CANDIDATE_DENIED/);
});
