"use strict";
/** PAY54 Batch 27 / 1156 — redacted session audit proof review. */
const SHA=/^[a-f0-9]{64}$/;
const deny=()=>{throw Error("PAY54_SECURITY_EVENT_AUDIT_DENIED");};
export function inspectPay54SessionAuditEvidence({
 eventDigest,recordedAtMs,eventType,appendOnlyStoreClaimed
}={}){
 if(!SHA.test(eventDigest??"") ||
    !Number.isSafeInteger(recordedAtMs)||recordedAtMs<1 ||
    !["SESSION_ISSUED","SESSION_REVOKED",
      "ACCOUNT_CONTEXT_BOUND","ACCOUNT_CONTEXT_SWITCHED",
      "ASSERTION_REPLAY_DENIED"].includes(eventType) ||
    typeof appendOnlyStoreClaimed!=="boolean")deny();
 return Object.freeze({
  schema:"pay54.session-audit-proof-source.v1",
  eventType,eventDigest,
  appendOnlyStoreClaimed,
  actualDatabaseAuditWriterVerified:false,
  noRawCredentialDisclosureVerifiedByThisEvent:false,
  customerIdentityIncluded:false,
  eventIndependentlyCorroborated:false,
  productionApprovalGranted:false
 });
}
