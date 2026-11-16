"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {reviewPay54RollbackEvidence}
 from "../governance/pay54-batch18-rollback-evidence.mjs";
const good=()=>({
 preDeploymentReviewSha:"a".repeat(40),
 candidateArchiveSha256:"b".repeat(64),
 rollbackReviewSha:"c".repeat(40),
 rollbackArchiveSha256:"d".repeat(64),
 rollbackDryRunId:"rehearsal-2026-11-16",
 rollbackRecoveryEvidence:"Signed-off test restoration checks",
 onCallReleaseOwner:"Release Manager",
 securityReviewer:"Independent security approver",
 founderApprovalReference:"Founder production change approval record",
 currentSiteConfigurationVerified:true,
 previousArtifactRetainedAndTested:true,
 rollbackRehearsedWithQa:true
});
test("643: complete rollback packet is not a permission to change live Pages settings",()=>{
 const r=reviewPay54RollbackEvidence(good());
 assert.equal(r.evidencePacketComplete,true);
 assert.equal(r.hashesExternallyValidated,false);
 assert.equal(r.environmentOwnerAuthenticated,false);
 assert.equal(r.realRollbackExecuted,false);
 assert.equal(r.deploymentAuthorised,false);
 assert.equal(r.productionRelease,"BLOCKED");
});
test("643: missing retained artifact or QA rehearsal prevents rollback readiness",()=>{
 const input=good();input.previousArtifactRetainedAndTested=false;
 input.rollbackRehearsedWithQa=false;
 const r=reviewPay54RollbackEvidence(input);
 assert.ok(r.findings.includes("ROLLBACK_ARTIFACT_UNVERIFIED"));
 assert.ok(r.findings.includes("ROLLBACK_REHEARSAL_UNVERIFIED"));
});
test("643: rollback to same source and malformed digests is rejected",()=>{
 const input=good();
 input.rollbackReviewSha=input.preDeploymentReviewSha;
 input.rollbackArchiveSha256="wrong";
 const r=reviewPay54RollbackEvidence(input);
 assert.ok(r.findings.includes("ROLLBACK_SOURCE_EQUALS_CANDIDATE"));
 assert.ok(r.findings.includes("INVALID_ROLLBACKARCHIVESHA256"));
});
test("643: empty or unstructured form cannot authorise a rollback",()=>{
 assert.throws(()=>reviewPay54RollbackEvidence(null),/OBJECT_REQUIRED/);
 const r=reviewPay54RollbackEvidence({});
 assert.equal(r.evidencePacketComplete,false);
});
