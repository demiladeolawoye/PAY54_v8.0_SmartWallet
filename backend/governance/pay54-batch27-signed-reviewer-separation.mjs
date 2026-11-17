"use strict";
/** Batch27/1140 — reviews must have distinct bounded security identities. */
const deny=()=>{throw Error("PAY54_SIGNED_REVIEWER_SEPARATION_DENIED");};
const ID=/^[a-z0-9][a-z0-9_.-]{3,63}$/;
export function inspectPay54IndependentReviewerSeparation({
 sourceAuthorId,securityReviewerId,dbaReviewerId,
 releaseReviewerId,complianceReviewerId
}={}){
 const ids=[sourceAuthorId,securityReviewerId,
  dbaReviewerId,releaseReviewerId,complianceReviewerId];
 if(ids.some(x=>typeof x!=="string"||!ID.test(x))||
    new Set(ids).size!==ids.length)deny();
 return Object.freeze({
  schema:"pay54.independent-release-reviewer-source.v1",
  distinctOfficeIdentities:ids.length,
  sourceAuthorCannotSelfApprove:true,
  actualProviderIdentityVerified:false,
  signedAttestationsVerified:false,
  productionReleaseAuthorised:false
 });
}
