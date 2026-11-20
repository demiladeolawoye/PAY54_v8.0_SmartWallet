"use strict";
/** PAY54 Batch 27 / 1164 — device-bound MFA challenge review, no auth service. */
const HEX=/^[a-f0-9]{64}$/;
const deny=()=>{throw Error("PAY54_MFA_CHALLENGE_EVIDENCE_DENIED");};
export function inspectPay54MfaChallengeEvidence({
 challengeDigest,deviceBindingDigest,issuedAtMs,
 expiresAtMs,nowMs,oneTimeConsumed
}={}){
 if(!HEX.test(challengeDigest??"") ||
    !HEX.test(deviceBindingDigest??"") ||
    challengeDigest===deviceBindingDigest ||
    !Number.isSafeInteger(issuedAtMs)||issuedAtMs<1 ||
    !Number.isSafeInteger(expiresAtMs)||
    !Number.isSafeInteger(nowMs)||nowMs<1 ||
    expiresAtMs<=issuedAtMs ||
    expiresAtMs-issuedAtMs>300000 ||
    typeof oneTimeConsumed!=="boolean")deny();
 return Object.freeze({
  schema:"pay54.mfa-challenge-source-review.v1",
  challengeWithinLifetime:issuedAtMs<=nowMs&&nowMs<expiresAtMs,
  oneTimeConsumptionClaimed:oneTimeConsumed,
  underlyingAuthenticatorIndependentlyVerified:false,
  customerSessionIssued:false,
  financialPermissionsGranted:false
 });
}
