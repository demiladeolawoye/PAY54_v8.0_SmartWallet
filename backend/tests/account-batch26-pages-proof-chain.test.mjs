"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {reviewPay54PagesProofChain as review}
 from "../governance/pay54-batch26-pages-proof-chain.mjs";
const sha="a".repeat(40),digest="b".repeat(64);
const good={
 repositoryFullName:"demiladeolawoye/PAY54_v8.0_SmartWallet",
 expectedCommitSha:sha,pagesConfig:{},deployment:{},
 manifest:{files:[{path:"index.html"}]},observedFiles:{},
 reviewerAttestation:{artifactSha256:digest},
 reviewerSignature:"valid",trustedReviewerPublicKey:{},trustedNowMs:1800000000000,
 examineMetadata:()=>({schema:"pay54.pages-deployment-metadata-review.v1",
  metadataStructurallyValid:true,inspectedSourceSha:sha,
  expectedArtifactDigest:digest,deploymentAuthorised:false}),
 examineArtifact:()=>({matchedFileCount:1,sourceCommitSha:sha,
  deploymentAuthorised:false}),
 examineSignature:()=>({sourceCommitSha:sha,signatureVerified:true,
  productionDeploymentAuthorised:false})
};
test("1028: composed Pages evidence never grants permission or confirms containment",()=>{
 const r=review(good);
 assert.equal(r.structurallyConsistentProofs,3);
 assert.equal(r.remoteArtifactComparedToCandidate,false);
 assert.equal(r.publicPagesSensitiveExposureResolved,false);
 assert.equal(r.productionReleaseAuthorised,false);
});
test("1028: mismatched candidate hashes or forged signature results deny",()=>{
 for(const x of [
  {reviewerAttestation:{artifactSha256:"c".repeat(64)}},
  {examineArtifact:()=>({matchedFileCount:0,
   sourceCommitSha:sha,deploymentAuthorised:false})},
  {examineSignature:()=>({sourceCommitSha:sha,
   signatureVerified:false,productionDeploymentAuthorised:false})},
  {examineMetadata:()=>{throw Error("private-token");}}
 ])assert.throws(()=>review({...good,...x}),/PAGES_PROOF_CHAIN_DENIED/);
});
