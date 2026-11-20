"use strict";
/** PAY54 Batch 27 / 1160 — credential rotation acceptance without secrets. */
const SHA=/^[a-f0-9]{64}$/;
const deny=()=>{throw Error("PAY54_CREDENTIAL_ROTATION_REVIEW_DENIED");};
export function inspectPay54CredentialRotationEvidence({
 oldSecretFingerprint,newSecretFingerprint,
 oldRevokedAtMs,newActivatedAtMs,operatorApproved
}={}){
 if(!SHA.test(oldSecretFingerprint??"")||
    !SHA.test(newSecretFingerprint??"")||
    oldSecretFingerprint===newSecretFingerprint ||
    !Number.isSafeInteger(oldRevokedAtMs)||oldRevokedAtMs<1 ||
    !Number.isSafeInteger(newActivatedAtMs)||newActivatedAtMs<1 ||
    typeof operatorApproved!=="boolean")deny();
 return Object.freeze({
  schema:"pay54.secret-rotation-evidence-source.v1",
  newFingerprintDistinct:true,
  oldSecretClaimedRevoked:oldRevokedAtMs>=newActivatedAtMs,
  operatorApprovedClaimed:operatorApproved,
  liveSecretManagerVersionIndependentlyVerified:false,
  actualProviderCredentialRevocationVerified:false,
  credentialsExposedInReport:false,
  productionReleaseAuthorised:false
 });
}
