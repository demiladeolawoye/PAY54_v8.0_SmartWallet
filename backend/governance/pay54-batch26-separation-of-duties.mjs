"use strict";
/** Batch26/1047 — reviewer separation policy; names alone are not authentication. */
const ID=/^[a-z0-9][a-z0-9._-]{2,63}$/;
const deny=()=>{throw Error("PAY54_RELEASE_SEPARATION_DENIED");};
export function inspectPay54ReleaseSeparation({authorId,
 reviewerIds,releaseOperatorId,securityReviewerId,
 complianceReviewerId}={}){
 if(!ID.test(authorId??"") || !ID.test(releaseOperatorId??"") ||
    !ID.test(securityReviewerId??"") ||
    !ID.test(complianceReviewerId??"") ||
    !Array.isArray(reviewerIds)||reviewerIds.length<2||
    reviewerIds.length>10||reviewerIds.some(x=>!ID.test(x)) ||
    new Set([authorId,releaseOperatorId,securityReviewerId,
     complianceReviewerId,...reviewerIds]).size!==reviewerIds.length+4)deny();
 return Object.freeze({
  schema:"pay54.release-separation-source-v1",
  reviewerCount:reviewerIds.length,
  sourceAuthorSeparateFromReviewers:true,
  securityAndComplianceSeparated:true,
  githubIdentitiesIndependentlyAuthenticated:false,
  approvalsAndAuthorityVerified:false,
  productionDeploymentAuthorised:false
 });
}
