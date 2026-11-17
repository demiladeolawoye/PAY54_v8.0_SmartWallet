"use strict";
/** Batch26/1035 — immutable rollback rehearsal evidence, never active deploy. */
const SHA=/^[a-f0-9]{40}$/;
const DIGEST=/^[a-f0-9]{64}$/;
const deny=()=>{throw Error("PAY54_ROLLBACK_EVIDENCE_DENIED");};
export function inspectPay54ReleaseRollbackPlan({
 candidateSha,knownGoodSha,candidateDigest,
 knownGoodDigest,approvedChangeId,
 rehearsalReadOnly
}={}){
 if(!SHA.test(candidateSha??"")||!SHA.test(knownGoodSha??"")||
    candidateSha===knownGoodSha ||
    !DIGEST.test(candidateDigest??"")||!DIGEST.test(knownGoodDigest??"")||
    typeof approvedChangeId!=="string" ||
    !/^PAY54-CHG-[1-9][0-9]{3,9}$/.test(approvedChangeId) ||
    rehearsalReadOnly!==true)deny();
 return Object.freeze({
  schema:"pay54.rollback-plan-review.v1",
  candidateSha,knownGoodSha,
  sourceAndKnownGoodDistinct:true,
  operatorChangeReference:approvedChangeId,
  preflightReadOnly:true,
  actualSiteRollbackRehearsed:false,
  knownGoodArtifactIndependentlyVerified:false,
  productionRollbackAuthorised:false,
  deploymentAuthorised:false
 });
}
