"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54StackedDraftPullRequests as inspect}
 from "../release/pay54-stacked-pr-review.mjs";
const base=Array.from({length:16},(_,i)=>({
 number:i+1,state:"open",draft:true,merged:false,
 headBranch:"cto/batch"+(i+13)+"-integration-branch",
 baseBranch:i===0?"project-titan":
  "cto/batch"+(i+12)+"-integration-branch",
 headSha:String(i%10).repeat(40)
}));
test("1193: contiguous draft PRs are not a production merge approval",()=>{
 const r=inspect({pullRequests:base,
  expectedFinalHead:"cto/batch28-integration-branch"});
 assert.equal(r.draftCount,16);
 assert.equal(r.hasContiguousBaseHeadSequence,true);
 assert.equal(r.aggregateDiffIndependentlyReviewed,false);
 assert.equal(r.mergeAuthorised,false);
});
test("1193: wrong base, gaps, merged or ready PRs never become silently safe",()=>{
 const changed=base.map((x,i)=>i===7?{...x,baseBranch:"project-titan"}:x);
 const r=inspect({pullRequests:changed});
 assert.deepEqual(r.dependencyChainGaps,[8]);
 for(const bad of [
  base.map((x,i)=>i===6?{...x,merged:true}:x),
  base.map((x,i)=>i===6?{...x,draft:false}:x),
  base.filter(x=>x.number!==7)
 ])assert.throws(()=>inspect({pullRequests:bad}),
  /STACKED_PR_REVIEW_DENIED/);
});
