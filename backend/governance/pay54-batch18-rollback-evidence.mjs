"use strict";

/**
 * PAY54 item 642 — bounded operational rollback readiness evidence packet.
 * Never executes a rollback, publishes a website, authenticates operators or
 * declares a self-supplied SHA to be an actually retained known-good artifact.
 */
const SHA=/^[a-f0-9]{40}$/;
const DIGEST=/^[a-f0-9]{64}$/;
const REQUIRED=[
 "preDeploymentReviewSha","candidateArchiveSha256",
 "rollbackReviewSha","rollbackArchiveSha256",
 "rollbackDryRunId","rollbackRecoveryEvidence",
 "onCallReleaseOwner","securityReviewer","founderApprovalReference"
];
export function reviewPay54RollbackEvidence(packet={}){
 if(!packet||typeof packet!=="object"||Array.isArray(packet)){
  throw new TypeError("PAY54_ROLLBACK_EVIDENCE_OBJECT_REQUIRED");
 }
 const issues=[];
 for(const name of REQUIRED){
  if(typeof packet[name]!=="string"||
   packet[name].length===0||packet[name].length>250){
   issues.push("MISSING_"+name.toUpperCase());
  }
 }
 for(const key of ["preDeploymentReviewSha","rollbackReviewSha"]){
  if(typeof packet[key]==="string"&&!SHA.test(packet[key])){
   issues.push("INVALID_"+key.toUpperCase());
  }
 }
 for(const key of ["candidateArchiveSha256","rollbackArchiveSha256"]){
  if(typeof packet[key]==="string"&&!DIGEST.test(packet[key])){
   issues.push("INVALID_"+key.toUpperCase());
  }
 }
 if(packet.preDeploymentReviewSha===packet.rollbackReviewSha&&
  SHA.test(packet.preDeploymentReviewSha??"")){
  issues.push("ROLLBACK_SOURCE_EQUALS_CANDIDATE");
 }
 if(packet.currentSiteConfigurationVerified!==true){
  issues.push("ACTIVE_SITE_CONFIGURATION_UNVERIFIED");
 }
 if(packet.previousArtifactRetainedAndTested!==true){
  issues.push("ROLLBACK_ARTIFACT_UNVERIFIED");
 }
 if(packet.rollbackRehearsedWithQa!==true){
  issues.push("ROLLBACK_REHEARSAL_UNVERIFIED");
 }
 return Object.freeze({
  schema:"pay54.rollback-evidence-review.v1",
  evidencePacketComplete:issues.length===0,
  findings:Object.freeze([...new Set(issues)]),
  hashesExternallyValidated:false,
  environmentOwnerAuthenticated:false,
  realRollbackExecuted:false,
  deploymentAuthorised:false,
  productionRelease:"BLOCKED"
 });
}
