"use strict";

/**
 * PAY54 Batch 28 / 1192 — stacked draft PR topology review.
 *
 * Existing PAY54 enterprise PRs #1+ are dependency-ordered; the latest
 * successful PR head is NOT equivalent to a reviewed default branch.
 * This pure audit never merges/retargets PRs and does not create approval.
 */
const SHA=/^[0-9a-f]{40}$/;
const REF=/^cto\/[a-z0-9][a-z0-9-]{5,120}$/;
const deny=()=>{throw Error("PAY54_STACKED_PR_REVIEW_DENIED");};
export function inspectPay54StackedDraftPullRequests({
 pullRequests,expectedFirstBase="project-titan",
 expectedFinalHead
}={}){
 if(!Array.isArray(pullRequests)||pullRequests.length<1||
    pullRequests.length>100 ||
    expectedFirstBase!=="project-titan" ||
    (expectedFinalHead!==undefined && !REF.test(expectedFinalHead)))deny();
 let priorHead=expectedFirstBase;
 const seen=new Set(),unmerged=[],risky=[];
 for(const [index,pr] of pullRequests.entries()){
  if(!pr||!Number.isSafeInteger(pr.number)||pr.number<1 ||
     seen.has(pr.number)||!REF.test(pr.headBranch??"")||
     !SHA.test(pr.headSha??"") ||
     typeof pr.baseBranch!=="string"||
     pr.state!=="open"||
     pr.merged!==false ||
     pr.draft!==true)deny();
  if(index>0&&pr.number!==pullRequests[index-1].number+1)deny();
  seen.add(pr.number);
  if(pr.baseBranch!==priorHead)risky.push(pr.number);
  priorHead=pr.headBranch;
  unmerged.push(pr.number);
 }
 if(expectedFinalHead!==undefined && priorHead!==expectedFinalHead)deny();
 return Object.freeze({
  schema:"pay54.stacked-draft-pr-topology.v1",
  draftCount:pullRequests.length,
  startPr:pullRequests[0].number,
  finalPr:pullRequests.at(-1).number,
  finalHeadBranch:priorHead,
  dependencyChainGaps:Object.freeze(risky),
  hasContiguousBaseHeadSequence:risky.length===0,
  allPullRequestsStillUnmerged:true,
  aggregateDiffIndependentlyReviewed:false,
  githubApiDataIndependentAuthenticationRequired:true,
  mergeAuthorised:false,
  stagingDeploymentAuthorised:false,
  productionReleaseAuthorised:false
 });
}
