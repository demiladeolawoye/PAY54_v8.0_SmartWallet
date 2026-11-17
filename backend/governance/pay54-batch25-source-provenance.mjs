"use strict";

/**
 * PAY54 Batch 25 / 985 — immutable PR source provenance gate.
 * Confirms a source-review checkout matches the stated PR head, rather than
 * mistakenly accepting GitHub's synthetic pull_request merge SHA.
 * GitHub event fields are a CI context, not an independent human signature.
 */
const SHA=/^[0-9a-f]{40}$/;
const REPO="demiladeolawoye/PAY54_v8.0_SmartWallet";
const HEAD="cto/batch25-operational-release-gates-968-1017";
const BASE="cto/batch24-auth-staging-918-967";
const deny=()=>{throw new Error("PAY54_BATCH25_REVIEW_PROVENANCE_DENIED");};

export function verifyPay54Batch25ReviewProvenance({
 repositoryFullName,pullRequestHeadSha,checkedOutSha,
 pullRequestHeadBranch,pullRequestBaseBranch,
 eventName,isDraft
}={}){
 if(repositoryFullName!==REPO ||
    !SHA.test(pullRequestHeadSha??"") ||
    checkedOutSha!==pullRequestHeadSha ||
    pullRequestHeadBranch!==HEAD ||
    pullRequestBaseBranch!==BASE ||
    eventName!=="pull_request" ||
    isDraft!==true)deny();
 return Object.freeze({
  schema:"pay54.batch25-exact-source-review.v1",
  sourceSha:checkedOutSha,
  repository:REPO,
  headBranch:HEAD,baseBranch:BASE,
  sourceIdentityMatchesPullRequestHead:true,
  draftReviewOnly:true,
  independentSecurityApprovalRecorded:false,
  cloudCredentialsRequested:false,
  stagingProvisioningAuthorised:false,
  productionDeploymentAuthorised:false
 });
}
