"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessPay54DefaultBranchMergeSafety as review}
 from "../release/pay54-default-branch-merge-safety.mjs";
const comparison={status:"diverged",ahead_by:2687,behind_by:2,
 baseSha:"a".repeat(40),headSha:"b".repeat(40),reportedFileCount:300};
const input={defaultBranch:"main",
 sourceBranch:"cto/batch28-integration-release-hardening-1188-1307",
 comparison,independentlyReviewedFileCount:300,
 exactMergedTreeCiPassed:false};
test("1205: PAY54 2,687-ahead/2-behind main divergence blocks direct merge",()=>{
 const r=review(input);
 assert.equal(r.directFastForwardPossible,false);
 assert.equal(r.missingDefaultBranchCommits,2);
 assert.equal(r.compareFileListMustBeIndependentlyCompleted,true);
 assert.equal(r.productionMergeAuthorised,false);
});
test("1205: 300-file truncated GitHub compare is not complete review",()=>{
 const r=review({...input,comparison:{...comparison,
  status:"ahead",behind_by:0},exactMergedTreeCiPassed:true});
 assert.equal(r.sourceEligibleForIndependentMergeReview,false);
 assert.equal(r.compareFileListMustBeIndependentlyCompleted,true);
});
test("1205: small fast-forward still requires protection and human review",()=>{
 const r=review({...input,comparison:{...comparison,
  status:"ahead",behind_by:0,reportedFileCount:12},
  independentlyReviewedFileCount:12,exactMergedTreeCiPassed:true});
 assert.equal(r.sourceEligibleForIndependentMergeReview,true);
 assert.equal(r.protectionAndReviewerSettingsIndependentlyVerified,false);
 assert.equal(r.productionMergeAuthorised,false);
});
