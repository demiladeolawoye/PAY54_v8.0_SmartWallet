"use strict";
/** PAY54 Batch 27 / 1176 — AML/sanctions hold blocks monetary fulfilment. */
const ID=/^[A-Za-z0-9_.:-]{8,128}$/;
const deny=()=>{throw Error("PAY54_SANCTIONS_HOLD_EVIDENCE_DENIED");};
export function inspectPay54SanctionsHoldEvidence({
 caseReference,screeningStatus,manualReviewerSigned,
 releasedAfterReview
}={}){
 if(!ID.test(caseReference??"") ||
    !["PENDING","HOLD","CLEARED","REJECTED"].includes(screeningStatus)||
    typeof manualReviewerSigned!=="boolean"||
    typeof releasedAfterReview!=="boolean")deny();
 const eligible=screeningStatus==="CLEARED"&&manualReviewerSigned&&
   releasedAfterReview;
 return Object.freeze({
  schema:"pay54.sanctions-screening-release-evidence.v1",
  manualReleasePrerequisiteClaimed:eligible,
  payoutHoldRequired:!eligible,
  screeningProviderVerdictIndependentlyVerified:false,
  complianceOfficerSignatureVerified:false,
  transactionExecutionAuthorised:false
 });
}
