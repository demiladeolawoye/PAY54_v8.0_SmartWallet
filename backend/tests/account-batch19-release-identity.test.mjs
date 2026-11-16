"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {reviewPay54ReleaseIdentityBinding}
 from "../governance/pay54-batch19-release-identity.mjs";
const valid=()=>({
 reviewCommitSha:"a".repeat(40),
 stagedSourceCommitSha:"a".repeat(40),
 offlinePreviewCommitSha:"a".repeat(40),
 browserQaCommitSha:"a".repeat(40),
 proposedDeploymentCommitSha:"a".repeat(40),
 restrictedSourceManifestSha256:"b".repeat(64),
 downloadedArtifactManifestSha256:"b".repeat(64),
 rollbackArchiveSha256:"c".repeat(64),
 rollbackCommitSha:"d".repeat(40)
});
test("669: coherent operator evidence cannot certify a live Pages deployment",()=>{
 const r=reviewPay54ReleaseIdentityBinding(valid());
 assert.equal(r.reviewedIdentityStructurallyConsistent,true);
 assert.deepEqual(r.findings,[]);
 assert.equal(r.githubSourceIdentityIndependentlyVerified,false);
 assert.equal(r.livePagesArtifactIndependentlyVerified,false);
 assert.equal(r.deploymentPermissionGranted,false);
 assert.equal(r.productionRelease,"BLOCKED");
});
test("669: stale screenshot SHA and mismatched Pages archive cannot pass",()=>{
 const p=valid();p.browserQaCommitSha="e".repeat(40);
 p.downloadedArtifactManifestSha256="f".repeat(64);
 const r=reviewPay54ReleaseIdentityBinding(p);
 assert.ok(r.findings.includes("REVIEW_SOURCE_SHA_DIVERGENCE"));
 assert.ok(r.findings.includes("RESTRICTED_ARTIFACT_MANIFEST_DIVERGENCE"));
});
test("669: rollback cannot point to candidate source",()=>{
 const p=valid();p.rollbackCommitSha=p.reviewCommitSha;
 const r=reviewPay54ReleaseIdentityBinding(p);
 assert.ok(r.findings.includes("ROLLBACK_IDENTICAL_TO_CANDIDATE"));
});
test("669: malformed or missing evidence fails closed",()=>{
 assert.throws(()=>reviewPay54ReleaseIdentityBinding(null),/PACKET_REQUIRED/);
 const r=reviewPay54ReleaseIdentityBinding({});
 assert.equal(r.reviewedIdentityStructurallyConsistent,false);
 assert.ok(r.findings.includes("INVALID_REVIEWCOMMITSHA"));
});
