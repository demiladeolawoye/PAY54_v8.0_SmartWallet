"use strict";

/**
 * PAY54 Batch25 source-only provenance assurance.
 *
 * Accept the original source-review branch while it is a draft, or the exact
 * protected integration branch for this release candidate, either as draft
 * or ready for independent review. Never accept main, push, synthetic merges
 * or arbitrary developer branches.
 *
 * Source review is NOT deployment or financial execution authorisation.
 */
const SHA=/^[0-9a-f]{40}$/;
const REPO="demiladeolawoye/PAY54_v8.0_SmartWallet";
const ORIGINAL=Object.freeze({
  head:"cto/batch25-operational-release-gates-968-1017",
  base:"cto/batch24-auth-staging-918-967"
});
const PROTECTED=Object.freeze({
  head:"cto/integration-batch25-protected-20261119",
  base:"project-titan"
});
const deny=()=>{throw new Error("PAY54_BATCH25_REVIEW_PROVENANCE_DENIED");};

export function verifyPay54Batch25ReviewProvenance({
  repositoryFullName,pullRequestHeadSha,checkedOutSha,
  pullRequestHeadBranch,pullRequestBaseBranch,
  eventName,isDraft
}={}){
  const original=pullRequestHeadBranch===ORIGINAL.head &&
    pullRequestBaseBranch===ORIGINAL.base && isDraft===true;
  const integrated=pullRequestHeadBranch===PROTECTED.head &&
    pullRequestBaseBranch===PROTECTED.base &&
    (isDraft===true || isDraft===false);

  if(repositoryFullName!==REPO ||
     !SHA.test(pullRequestHeadSha??"") ||
     checkedOutSha!==pullRequestHeadSha ||
     eventName!=="pull_request" ||
     !(original || integrated))deny();

  return Object.freeze({
    schema:"pay54.batch25-exact-source-review.v1",
    sourceSha:checkedOutSha,
    repository:REPO,
    headBranch:pullRequestHeadBranch,
    baseBranch:pullRequestBaseBranch,
    sourceIdentityMatchesPullRequestHead:true,
    draftReviewOnly:isDraft,
    reviewSourceOnly:true,
    independentSecurityApprovalRecorded:false,
    cloudCredentialsRequested:false,
    stagingProvisioningAuthorised:false,
    productionDeploymentAuthorised:false
  });
}
