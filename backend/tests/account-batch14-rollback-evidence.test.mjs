"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessPay54RollbackEvidence} from "../governance/pay54-rollback-evidence-review.mjs";
const now="2026-11-16T21:00:00.000Z";
function sample(){
 return {
  currentCommitSha:"a".repeat(40),rollbackCommitSha:"b".repeat(40),
  rollbackArtifactSha256:"c".repeat(64),
  archiveIsImmutable:true,restoreTestSucceeded:true,
  recoveryObjectiveMinutes:30,rehearsedAt:"2026-11-15T21:00:00.000Z",
  owner:"release-manager",reviewer:"independent-security",
  customerImpactAssessed:true,supportEscalationDocumented:true
 };
}
test("458: complete rollback metadata does not establish actual rehearsal",()=>{
 const result=assessPay54RollbackEvidence(sample(),{now});
 assert.equal(result.evidenceMetadataComplete,true);
 assert.equal(result.actualRollbackRehearsalIndependentlyObserved,false);
 assert.equal(result.archiveCustodyIndependentlyVerified,false);
 assert.equal(result.releaseAuthorised,false);
 assert.equal(result.productionRelease,"BLOCKED");
});
test("458: immutable backup and successful restore evidence are mandatory",()=>{
 for(const change of [{archiveIsImmutable:false},{restoreTestSucceeded:false}]){
  const result=assessPay54RollbackEvidence({...sample(),...change},{now});
  assert.ok(result.issues.includes("ARCHIVE_OR_RESTORE_UNVERIFIED"));
 }
});
test("458: independent reviewer and customer impact evidence are mandatory",()=>{
 const result=assessPay54RollbackEvidence({...sample(),
  owner:"same",reviewer:"same",customerImpactAssessed:false},{now});
 assert.ok(result.issues.includes("INDEPENDENT_REVIEW_MISSING"));
 assert.ok(result.issues.includes("OPERATIONAL_IMPACT_REVIEW_MISSING"));
});
test("458: stale rehearsal, future rehearsal and out-of-bounds RTO fail",()=>{
 for(const change of [
  {rehearsedAt:"2026-10-01T00:00:00.000Z"},
  {rehearsedAt:"2026-11-17T00:00:00.000Z"},
  {recoveryObjectiveMinutes:0},{recoveryObjectiveMinutes:200}
 ]){
  assert.equal(assessPay54RollbackEvidence({...sample(),...change},{now})
   .evidenceMetadataComplete,false);
 }
});
test("458: invalid commit and missing evaluation clock fail closed",()=>{
 const result=assessPay54RollbackEvidence({...sample(),rollbackCommitSha:"a".repeat(40)},{now});
 assert.ok(result.issues.includes("COMMIT_LINEAGE_INVALID"));
 assert.throws(()=>assessPay54RollbackEvidence(sample()),/CLOCK_REQUIRED/);
});
