"use strict";
/** Batch27/1091 — enforce honest evidence state transitions. */
const STATES=Object.freeze([
 "NOT_VERIFIED","REQUESTED","OBSERVED","INDEPENDENTLY_REVIEWED",
 "CLOSED_WITH_SIGNOFF"
]);
const deny=()=>{throw new Error("PAY54_EVIDENCE_STATUS_TRANSITION_DENIED");};
export function validatePay54EvidenceStateTransition({
 from,to,independentReviewerSigned,securityOfficerSigned,
 proofDigestPresent
}={}){
 if(!STATES.includes(from)||!STATES.includes(to) ||
    typeof independentReviewerSigned!=="boolean"||
    typeof securityOfficerSigned!=="boolean"||
    typeof proofDigestPresent!=="boolean")deny();
 const i=STATES.indexOf(from),j=STATES.indexOf(to);
 if(j<i||j>i+1)deny();
 if(j>=3 &&(!independentReviewerSigned||!proofDigestPresent))deny();
 if(j===4 && !securityOfficerSigned)deny();
 return Object.freeze({
  schema:"pay54.operational-evidence-transition.v1",
  from,to,structuralTransitionPermitted:true,
  reviewerSignaturesCryptographicallyValidated:false,
  evidenceSourceIndependentlyAuthenticated:false,
  systemStatusModified:false,
  releaseAuthorised:false
 });
}
