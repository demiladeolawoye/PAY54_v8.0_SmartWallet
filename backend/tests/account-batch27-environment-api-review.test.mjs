"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54GithubEnvironmentPolicy as inspect}
 from "../governance/pay54-batch27-environment-api-review.mjs";
const input={environmentName:"pay54-staging",
 observedEnvironment:{name:"pay54-staging",protection_rules:[{
  type:"required_reviewers",reviewers:[{id:1},{id:2}]}],
  deployment_branch_policy:{allowed_branches:["project-titan"]}}};
test("1149: two reviewers and protected branches still need authenticated source",()=>{
 const r=inspect(input);
 assert.equal(r.independentReviewThresholdClaimed,true);
 assert.equal(r.protectionRulesLiveVerified,false);
 assert.equal(r.deploymentAuthorised,false);
});
test("1149: arbitrary branch and one reviewer not accepted as restricted policy",()=>{
 const a=inspect({...input,observedEnvironment:{
  ...input.observedEnvironment,deployment_branch_policy:{
   allowed_branches:["project-titan","feature/wildcard"]}}});
 assert.equal(a.reviewedBranchAllowlistRestricted,false);
 assert.equal(inspect({...input,observedEnvironment:{
  ...input.observedEnvironment,protection_rules:[{
   type:"required_reviewers",reviewers:[{id:1}]}]}})
  .independentReviewThresholdClaimed,false);
});
