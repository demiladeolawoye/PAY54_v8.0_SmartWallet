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
const protectedPair={
  ...valid,
  pullRequestHeadBranch:"cto/integration-batch25-protected-20261119",
  pullRequestBaseBranch:"project-titan"
};

test("986: original draft source provenance requires exact SHA and branch",()=>{
  const r=verify(valid);
  assert.equal(r.sourceSha,sha);
  assert.equal(r.sourceIdentityMatchesPullRequestHead,true);
  assert.equal(r.draftReviewOnly,true);
  assert.equal(r.reviewSourceOnly,true);
  assert.equal(r.productionDeploymentAuthorised,false);
  assert.ok(Object.isFrozen(r));
});

test("986: exact protected integration source is permitted for draft and reviewed PR states",()=>{
  for(const draft of [true,false]){
    const r=verify({...protectedPair,isDraft:draft});
    assert.equal(r.sourceSha,sha);
    assert.equal(r.headBranch,protectedPair.pullRequestHeadBranch);
    assert.equal(r.baseBranch,"project-titan");
    assert.equal(r.draftReviewOnly,draft);
    assert.equal(r.reviewSourceOnly,true);
    assert.equal(r.productionDeploymentAuthorised,false);
    assert.equal(r.stagingProvisioningAuthorised,false);
    assert.equal(r.independentSecurityApprovalRecorded,false);
  }
});

test("986: original PR is not allowed to lose its draft-only hold",()=>{
  assert.throws(()=>verify({...valid,isDraft:false}),
    /BATCH25_REVIEW_PROVENANCE_DENIED/);
});

test("986: synthetic merge, branch substitution, wrong target, release event and invalid SHA fail closed",()=>{
  const mutations=[
    {checkedOutSha:"b".repeat(40)},
    {pullRequestHeadSha:"b".repeat(40)},
    {pullRequestBaseBranch:"main"},
    {pullRequestHeadBranch:"refs/heads/project-titan"},
    {pullRequestHeadBranch:"cto/integration-batch24-protected-20261119"},
    {eventName:"push"},
    {eventName:"workflow_dispatch"},
    {repositoryFullName:"attacker/evil"},
    {pullRequestHeadSha:"short"},
    {isDraft:null},
    {isDraft:"true"}
  ];
  for(const fixture of [valid,protectedPair]){
    for(const mutation of mutations){
      assert.throws(()=>verify({...fixture,...mutation}),
        /BATCH25_REVIEW_PROVENANCE_DENIED/);
    }
  }
});

test("986: partial branch pair cannot borrow privilege from original or protected path",()=>{
  for(const mutation of [
    {pullRequestHeadBranch:valid.pullRequestHeadBranch},
    {pullRequestBaseBranch:valid.pullRequestBaseBranch},
    {pullRequestBaseBranch:"main"},
    {pullRequestBaseBranch:"cto/batch25-operational-release-gates-968-1017"}
  ])assert.throws(()=>verify({...protectedPair,...mutation}),
    /BATCH25_REVIEW_PROVENANCE_DENIED/);
});
