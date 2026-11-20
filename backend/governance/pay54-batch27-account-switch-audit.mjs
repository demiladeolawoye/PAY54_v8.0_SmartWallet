"use strict";
/** PAY54 Batch 27 / 1166 — compare atomic session transition evidence. */
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const deny=()=>{throw Error("PAY54_ACCOUNT_SWITCH_AUDIT_EVIDENCE_DENIED");};
export function inspectPay54AccountSwitchAudit({
 priorSessionId,nextSessionId,
 priorVersion,nextVersion,oldRevoked,
 auditRowCommitted,accountMemberVerified
}={}){
 if(!UUID.test(priorSessionId??"") ||
    !UUID.test(nextSessionId??"") ||
    priorSessionId===nextSessionId ||
    !Number.isSafeInteger(priorVersion)||priorVersion<1 ||
    nextVersion!==priorVersion+1 ||
    typeof oldRevoked!=="boolean" ||
    typeof auditRowCommitted!=="boolean" ||
    typeof accountMemberVerified!=="boolean")deny();
 return Object.freeze({
  schema:"pay54.account-session-transition-audit.v1",
  sessionVersionIncremented:true,
  claimedOldRevocation:oldRevoked,
  claimedAuditPersisted:auditRowCommitted,
  claimedMembershipVerified:accountMemberVerified,
  singleDbTransactionIndependentlyVerified:false,
  actualCustomerContextUpdated:false,
  productionAccountSwitchEnabled:false
 });
}
