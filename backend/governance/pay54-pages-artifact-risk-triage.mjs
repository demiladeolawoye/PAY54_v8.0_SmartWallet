"use strict";

/**
 * PAY54 item 485 — deterministic publication artifact risk classification.
 * Preserves separation between verified archive overpublication, independently
 * observed public path reachability and independently verified secrets exposure.
 * It cannot authorise deployment or incident closure.
 */

export function classifyPay54PagesArtifactRisk({
 archiveReview,publicReachability,contentSensitivity
}={}){
 if(!archiveReview||archiveReview.schema!=="pay54.pages-tar-member-index.v1"){
  throw new TypeError("PAY54_PAGES_TAR_REVIEW_REQUIRED");
 }
 const blocked=archiveReview.blockedRoots??[];
 const knownBad=Array.isArray(blocked)&&blocked.length>0||
  archiveReview.archiveSourceBoundaryPassed!==true;
 const reachability=publicReachability==="CONFIRMED_ACCESSIBLE"?
  "CONFIRMED_ACCESSIBLE":publicReachability==="CONFIRMED_NOT_ACCESSIBLE_FOR_SAMPLED_PATHS"?
  "SAMPLED_PATHS_NOT_ACCESSIBLE":"UNVERIFIED";
 const sensitivity=contentSensitivity==="CONFIRMED_SENSITIVE"?
  "CONFIRMED_SENSITIVE":contentSensitivity==="CONFIRMED_PUBLIC_SOURCE_ONLY"?
  "PUBLIC_SOURCE_ONLY_REVIEWED":"UNVERIFIED";
 const findings=[];
 if(knownBad)findings.push("ARTIFACT_PUBLICATION_BOUNDARY_FAILED");
 if(reachability==="CONFIRMED_ACCESSIBLE"&&knownBad){
  findings.push("INTERNAL_PATH_REACHABILITY_REQUIRES_INCIDENT_REVIEW");
 }
 if(sensitivity==="CONFIRMED_SENSITIVE"){
  findings.push("SENSITIVE_CONTENT_REQUIRES_SECURITY_RESPONSE");
 }
 return Object.freeze({
  schema:"pay54.pages-artifact-risk-triage.v1",
  artifactBoundaryStatus:knownBad?"FAILED":"SOURCE_POLICY_PASSED",
  publicReachabilityStatus:reachability,
  contentSensitivityStatus:sensitivity,
  findings:Object.freeze(findings),
  containmentReviewPriority:knownBad?"P0":"SECURITY_REVIEW_REQUIRED",
  publicSecretExposureEstablished:reachability==="CONFIRMED_ACCESSIBLE"&&
   sensitivity==="CONFIRMED_SENSITIVE",
  independenceOfClaimsVerified:false,
  riskCleared:false,
  releaseAuthorised:false,
  productionRelease:"BLOCKED"
 });
}
