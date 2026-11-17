"use strict";

/**
 * PAY54 Batch 28 / 1204 — prevent large, unsafe direct-to-main promotion.
 *
 * GitHub compare status and up-to-date base SHA must be independently
 * authenticated. This is a pure review of provided metadata. It never merges.
 */
const SHA=/^[0-9a-f]{40}$/;
const deny=()=>{throw Error("PAY54_DEFAULT_BRANCH_PROMOTION_DENIED");};
export function assessPay54DefaultBranchMergeSafety({
 defaultBranch,sourceBranch,comparison,
 independentlyReviewedFileCount,
 exactMergedTreeCiPassed
}={}){
 if(defaultBranch!=="main" ||
    typeof sourceBranch!=="string"||
    !/^cto\/[a-z0-9-]{6,130}$/.test(sourceBranch) ||
    !comparison ||typeof comparison!=="object" ||
    !["ahead","behind","identical","diverged"].includes(comparison.status) ||
    !Number.isSafeInteger(comparison.ahead_by) ||
    !Number.isSafeInteger(comparison.behind_by) ||
    comparison.ahead_by<0||comparison.behind_by<0 ||
    !SHA.test(comparison.baseSha??"")||
    !SHA.test(comparison.headSha??"")||
    !Number.isSafeInteger(comparison.reportedFileCount)||
    comparison.reportedFileCount<0||
    !Number.isSafeInteger(independentlyReviewedFileCount)||
    independentlyReviewedFileCount<0||
    typeof exactMergedTreeCiPassed!=="boolean")deny();
 const fastForward= comparison.status==="ahead" &&
  comparison.behind_by===0;
 const completeFileReview=independentlyReviewedFileCount>=
  comparison.reportedFileCount && comparison.reportedFileCount<300;
 const reviewCandidate=fastForward && completeFileReview &&
  exactMergedTreeCiPassed;
 return Object.freeze({
  schema:"pay54.default-branch-merge-preflight.v1",
  sourceBranch,sourceSha:comparison.headSha,
  defaultBranch,baseSha:comparison.baseSha,
  directFastForwardPossible:fastForward,
  compareFileListMustBeIndependentlyCompleted:!completeFileReview,
  missingDefaultBranchCommits:comparison.behind_by,
  mergedTreeRegressionClaimed:exactMergedTreeCiPassed,
  sourceEligibleForIndependentMergeReview:reviewCandidate,
  protectionAndReviewerSettingsIndependentlyVerified:false,
  githubCompareResponseIndependentlyAuthenticated:false,
  productionMergeAuthorised:false,
  deploymentAuthorised:false
 });
}
