"use strict";
/** Batch26/1027 — compose independently signed source/artifact proof. */
import {verifyPay54PagesArtifactProvenance}
 from "./pay54-batch26-artifact-provenance.mjs";
import {verifyPay54PagesAttestation}
 from "./pay54-batch26-pages-attestation.mjs";
import {inspectPay54PagesDeploymentMetadata}
 from "./pay54-batch26-pages-metadata.mjs";
const deny=()=>{throw new Error("PAY54_PAGES_PROOF_CHAIN_DENIED");};
export function reviewPay54PagesProofChain({
 repositoryFullName,expectedCommitSha,pagesConfig,deployment,
 manifest,observedFiles,reviewerAttestation,
 reviewerSignature,trustedReviewerPublicKey,trustedNowMs,
 examineMetadata=inspectPay54PagesDeploymentMetadata,
 examineArtifact=verifyPay54PagesArtifactProvenance,
 examineSignature=verifyPay54PagesAttestation
}={}){
 try{
  const meta=examineMetadata({repositoryFullName,expectedCommitSha,
    pagesConfig,deployment});
  const artifact=examineArtifact({expectedCommitSha,manifest,observedFiles});
  const signature=examineSignature({statement:reviewerAttestation,
    signature:reviewerSignature,trustedReviewerPublicKey,
    expectedCommitSha,trustedNowMs});
  if(meta?.schema!=="pay54.pages-deployment-metadata-review.v1" ||
     !meta.metadataStructurallyValid ||
     meta.inspectedSourceSha!==expectedCommitSha ||
     meta.expectedArtifactDigest!==reviewerAttestation?.artifactSha256 ||
     artifact?.matchedFileCount!==manifest?.files?.length ||
     artifact?.sourceCommitSha!==expectedCommitSha ||
     signature?.sourceCommitSha!==expectedCommitSha ||
     signature?.signatureVerified!==true ||
     meta.deploymentAuthorised!==false ||
     artifact.deploymentAuthorised!==false ||
     signature.productionDeploymentAuthorised!==false)deny();
  return Object.freeze({
   schema:"pay54.pages-proof-chain-review.v1",
   sourceSha:expectedCommitSha,
   structurallyConsistentProofs:3,
   independentGithubApiAuthenticationStillRequired:true,
   remoteArtifactComparedToCandidate:false,
   publicPagesSensitiveExposureResolved:false,
   stagingReleaseAuthorised:false,
   productionReleaseAuthorised:false
  });
 }catch{deny();}
}
