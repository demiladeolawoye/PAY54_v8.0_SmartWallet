"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54ReleaseSeparation as inspect}
 from "../governance/pay54-batch26-separation-of-duties.mjs";
const base={authorId:"cto_source_author",
 reviewerIds:["reviewer_one","reviewer_two"],
 releaseOperatorId:"release_operator",securityReviewerId:"security_lead",
 complianceReviewerId:"compliance_lead"};
test("1048: distinct named roles are not authenticated GitHub or regulator approvals",()=>{
 const r=inspect(base);assert.equal(r.reviewerCount,2);
 assert.equal(r.githubIdentitiesIndependentlyAuthenticated,false);
 assert.equal(r.productionDeploymentAuthorised,false);
});
test("1048: review self-approval, reused reviewer and missing compliance forbidden",()=>{
 for(const bad of [
  {reviewerIds:["reviewer_one","reviewer_one"]},
  {reviewerIds:["cto_source_author","reviewer_two"]},
  {complianceReviewerId:"security_lead"},
  {reviewerIds:["reviewer_one"]}
 ])assert.throws(()=>inspect({...base,...bad}),/RELEASE_SEPARATION_DENIED/);
});
