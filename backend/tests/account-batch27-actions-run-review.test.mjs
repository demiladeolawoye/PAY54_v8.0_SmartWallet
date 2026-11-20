"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54ActionsExactHeadRuns as inspect}
 from "../governance/pay54-batch27-actions-run-review.mjs";
const sha="a".repeat(40),good=[{id:1,name:"PAY54 security",
 head_sha:sha,status:"completed",conclusion:"success"}];
test("1153: exact-head green run does not mean all required workflows ran",()=>{
 const r=inspect({expectedSha:sha,runs:good});
 assert.equal(r.allReportedRunsPassed,true);
 assert.equal(r.requiredWorkflowInventoryIndependentlyVerified,false);
 assert.equal(r.liveReleaseAuthorised,false);
});
test("1153: cancelled, timed out and wrong SHA rejected as final acceptance",()=>{
 const r=inspect({expectedSha:sha,runs:[...good,
  {id:2,name:"other",head_sha:sha,status:"completed",conclusion:"cancelled"}]});
 assert.equal(r.allReportedRunsPassed,false);
 assert.ok(r.failedOrNonPassingRunIds.includes(2));
 assert.throws(()=>inspect({expectedSha:sha,runs:[{
  ...good[0],head_sha:"b".repeat(40)}]}),/ACTIONS_RUN_STATUS_DENIED/);
});
