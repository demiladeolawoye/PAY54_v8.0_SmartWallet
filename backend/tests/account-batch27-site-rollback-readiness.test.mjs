"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54SiteRollbackReadiness as inspect}
 from "../governance/pay54-batch27-site-rollback-readiness.mjs";
const x={candidateSha:"a".repeat(40),knownGoodSha:"b".repeat(40),
 candidateArtifactHash:"c".repeat(64),knownGoodArtifactHash:"d".repeat(64),
 artifactRestorable:true,databaseMutationIncluded:false};
test("1102: static site rollback plan cannot authorise deployment",()=>{
 const r=inspect(x);assert.equal(r.actualRollbackRehearsalObserved,false);
 assert.equal(r.deploymentAuthorised,false);
});
test("1102: same commit, unproven artifact and database changes rejected",()=>{
 for(const y of [{knownGoodSha:x.candidateSha},{artifactRestorable:false},
  {candidateArtifactHash:"unknown"},{databaseMutationIncluded:true}])
 assert.throws(()=>inspect({...x,...y}),
 /SITE_ROLLBACK_PREFLIGHT_DENIED/);
});
