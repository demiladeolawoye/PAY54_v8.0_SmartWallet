"use strict";
/** Batch27/1134 — record a performed rollback without self-authorising close. */
const SHA=/^[a-f0-9]{40}$/;
const deny=()=>{throw Error("PAY54_ROLLBACK_OPERATOR_EVIDENCE_DENIED");};
export function inspectPay54RollbackOperatorEvidence({
 beforeSha,restoredSha,observedAtMs,releaseTicket,
 reviewerCount
}={}){
 if(!SHA.test(beforeSha??"")||!SHA.test(restoredSha??"")||
    beforeSha===restoredSha ||
    !Number.isSafeInteger(observedAtMs)||observedAtMs<=0||
    !/^PAY54-CHG-[1-9][0-9]{3,9}$/.test(releaseTicket??"")||
    !Number.isInteger(reviewerCount)||reviewerCount<2)deny();
 return Object.freeze({
  schema:"pay54.rollback-operator-evidence-review.v1",
  beforeSha,restoredSha,
  distinctReleaseIdentities:true,
  declaredReviewerCount:reviewerCount,
  actualGitHubDeploymentEventIndependentlyVerified:false,
  restoredPublicArtifactIndependentlyHashed:false,
  outageRecoveryApproved:false,
  productionReleaseAuthorised:false
 });
}
