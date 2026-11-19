"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {verifyPay54Batch25ReviewProvenance as verify}
 from "../governance/pay54-batch25-source-provenance.mjs";

const sha="a".repeat(40);
const valid={
 repositoryFullName:"demiladeolawoye/PAY54_v8.0_SmartWallet",
 pullRequestHeadSha:sha,
 checkedOutSha:sha,
 pullRequestHeadBranch:"cto/batch25-operational-release-gates-968-1017",
 pullRequestBaseBranch:"cto/batch24-auth-staging-918-967",
 eventName:"pull_request",
 isDraft:true
};
test("986: exact checked-out review SHA is bound to immutable PR head",()=>{
 const r=verify(valid);
 assert.equal(r.sourceSha,sha);
 assert.equal(r.sourceIdentityMatchesPullRequestHead,true);
 assert.equal(r.draftReviewOnly,true);
 assert.equal(r.productionDeploymentAuthorised,false);
 assert.ok(Object.isFrozen(r));
});
test("986: synthetic merge SHA, wrong target, release event or published PR fail",()=>{
 for(const mutation of [
  {checkedOutSha:"b".repeat(40)},
  {pullRequestBaseBranch:"main"},
  {pullRequestHeadBranch:"refs/heads/project-titan"},
  {eventName:"push"},
  {eventName:"workflow_dispatch"},
  {isDraft:false},
  {repositoryFullName:"attacker/evil"},
  {pullRequestHeadSha:"short"}
 ])assert.throws(()=>verify({...valid,...mutation}),
  /BATCH25_REVIEW_PROVENANCE_DENIED/);
});
