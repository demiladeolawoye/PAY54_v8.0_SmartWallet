"use strict";

/**
 * PAY54 Batch 19 item 668 — release-identity evidence binding.
 *
 * A local source-artifact gate: rejects accidental mixing of review SHA,
 * staged asset manifest, downloaded Pages tar and dashboard QA screenshots.
 * Inputs are untrusted operator records, not GitHub control-plane attestations.
 */
const COMMIT=/^[a-f0-9]{40}$/;
const DIGEST=/^[a-f0-9]{64}$/;
const SAME_REVIEW_FIELDS=Object.freeze([
 "reviewCommitSha","stagedSourceCommitSha","offlinePreviewCommitSha",
 "browserQaCommitSha","proposedDeploymentCommitSha"
]);
const DIGEST_FIELDS=Object.freeze([
 "restrictedSourceManifestSha256",
 "downloadedArtifactManifestSha256",
 "rollbackArchiveSha256"
]);
export function reviewPay54ReleaseIdentityBinding(packet={}){
 if(!packet||typeof packet!=="object"||Array.isArray(packet)){
  throw new TypeError("PAY54_RELEASE_IDENTITY_PACKET_REQUIRED");
 }
 const issues=[];
 for(const field of SAME_REVIEW_FIELDS){
  if(!COMMIT.test(packet[field]??"")){
   issues.push("INVALID_"+field.toUpperCase());
  }
 }
 if(SAME_REVIEW_FIELDS.every(k=>COMMIT.test(packet[k]??""))){
  const unique=new Set(SAME_REVIEW_FIELDS.map(k=>packet[k]));
  if(unique.size!==1)issues.push("REVIEW_SOURCE_SHA_DIVERGENCE");
 }
 for(const field of DIGEST_FIELDS){
  if(!DIGEST.test(packet[field]??"")){
   issues.push("INVALID_"+field.toUpperCase());
  }
 }
 if(DIGEST.test(packet.restrictedSourceManifestSha256??"")&&
  DIGEST.test(packet.downloadedArtifactManifestSha256??"")&&
  packet.restrictedSourceManifestSha256!==packet.downloadedArtifactManifestSha256){
  issues.push("RESTRICTED_ARTIFACT_MANIFEST_DIVERGENCE");
 }
 if(COMMIT.test(packet.reviewCommitSha??"")&&
  packet.rollbackCommitSha===packet.reviewCommitSha){
  issues.push("ROLLBACK_IDENTICAL_TO_CANDIDATE");
 }
 if(!COMMIT.test(packet.rollbackCommitSha??"")){
  issues.push("ROLLBACK_COMMIT_SHA_INVALID");
 }
 return Object.freeze({
  schema:"pay54.batch19-release-identity-review.v1",
  reviewedIdentityStructurallyConsistent:issues.length===0,
  findings:Object.freeze([...new Set(issues)]),
  githubSourceIdentityIndependentlyVerified:false,
  livePagesArtifactIndependentlyVerified:false,
  rollbackArchiveIndependentlyAuthenticated:false,
  deploymentPermissionGranted:false,
  siteSettingsChanged:false,
  productionRelease:"BLOCKED"
 });
}
