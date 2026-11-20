"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54ReleaseRollbackPlan as inspect}
 from "../governance/pay54-batch26-rollback-evidence.mjs";
const x={candidateSha:"a".repeat(40),knownGoodSha:"b".repeat(40),
 candidateDigest:"c".repeat(64),knownGoodDigest:"d".repeat(64),
 approvedChangeId:"PAY54-CHG-2026",rehearsalReadOnly:true};
test("1036: rollback plan is not a completed restore rehearsal",()=>{
 const r=inspect(x);
 assert.equal(r.actualSiteRollbackRehearsed,false);
 assert.equal(r.deploymentAuthorised,false);
 assert.equal(r.sourceAndKnownGoodDistinct,true);
});
test("1036: same SHA, untrusted digest and active rehearsal fail closed",()=>{
 for(const changed of [
  {knownGoodSha:x.candidateSha},
  {candidateDigest:"invalid"},
  {approvedChangeId:"DROP-TABLE"},
  {rehearsalReadOnly:false}
 ])assert.throws(()=>inspect({...x,...changed}),/ROLLBACK_EVIDENCE_DENIED/);
});
