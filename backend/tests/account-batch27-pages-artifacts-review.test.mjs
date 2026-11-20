"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54GithubPagesArtifactInventory as inspect}
 from "../governance/pay54-batch27-pages-artifacts-review.mjs";
test("1155: named unexpired artifact is not active deployed Pages proof",()=>{
 const r=inspect({expectedSourceSha:"a".repeat(40),
  artifacts:[{id:123,name:"github-pages",expired:false,size_in_bytes:4500}]});
 assert.deepEqual(r.nonExpiredPagesArtifactIds,[123]);
 assert.equal(r.activePagesDeploymentMatched,false);
 assert.equal(r.deploymentAuthorised,false);
});
test("1155: stale/expired and duplicated artifacts cannot be misrepresented",()=>{
 const a={id:2,name:"github-pages",expired:true,size_in_bytes:500};
 const r=inspect({expectedSourceSha:"a".repeat(40),artifacts:[a]});
 assert.equal(r.nonExpiredPagesArtifactIds.length,0);
 assert.throws(()=>inspect({expectedSourceSha:"a".repeat(40),artifacts:[a,a]}),
 /PAGES_ARTIFACTS_REVIEW_DENIED/);
});
