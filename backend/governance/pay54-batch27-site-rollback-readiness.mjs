"use strict";
/** Batch27/1101 — verified-source candidate vs known-good release for rollback. */
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^[a-f0-9]{64}$/;
const deny=()=>{throw Error("PAY54_SITE_ROLLBACK_PREFLIGHT_DENIED");};
export function inspectPay54SiteRollbackReadiness({
 candidateSha,knownGoodSha,candidateArtifactHash,
 knownGoodArtifactHash,artifactRestorable,
 databaseMutationIncluded
}={}){
 if(!SHA.test(candidateSha??"")||!SHA.test(knownGoodSha??"")||
    candidateSha===knownGoodSha ||
    !HASH.test(candidateArtifactHash??"") ||
    !HASH.test(knownGoodArtifactHash??"") ||
    artifactRestorable!==true||databaseMutationIncluded!==false)deny();
 return Object.freeze({
  schema:"pay54.site-rollback-readiness-v1",
  distinctReleaseArtifacts:true,
  knownGoodContentHashAvailable:true,
  sourceAndArtifactIdentityIndependentlyVerified:false,
  actualRollbackRehearsalObserved:false,
  deployerPrivilegesIndependentlyVerified:false,
  deploymentAuthorised:false
 });
}
