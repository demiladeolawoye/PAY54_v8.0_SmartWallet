"use strict";
/** Batch27/1114 — compare operator-observed public static hash to candidate. */
const HASH=/^[a-f0-9]{64}$/;
const deny=()=>{throw Error("PAY54_PUBLIC_STATIC_COMPARE_DENIED");};
export function comparePay54PublicStaticObservation({
 expectedPath,reviewedCandidateSha256,publicObservation
}={}){
 if(typeof expectedPath!=="string" ||
    !["index.html","dashboard.html","assets/css/dashboard.css"].includes(expectedPath)||
    !HASH.test(reviewedCandidateSha256??"") ||
    publicObservation?.schema!=="pay54.public-static-byte-hash-observation.v1" ||
    publicObservation.publicPath!==expectedPath ||
    !HASH.test(publicObservation.sha256??"") ||
    publicObservation.artifactReleaseAuthorised!==false)deny();
 return Object.freeze({
  schema:"pay54.public-to-reviewed-static-content-comparison.v1",
  path:expectedPath,
  observedBytesMatchReviewedCandidate:
   reviewedCandidateSha256===publicObservation.sha256,
  comparisonDidNotRetrievePrivateSource:true,
  independentProvenanceAndTlsReviewRequired:true,
  websiteContainmentConfirmed:false,
  productionReleaseAuthorised:false
 });
}
