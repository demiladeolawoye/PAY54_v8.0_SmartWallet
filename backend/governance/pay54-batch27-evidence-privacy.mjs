"use strict";
/** Batch27/1085 — redact/deny private values before operational report export. */
const SAFE=/^[a-z0-9_.:-]{1,64}$/i;
const SHA=/^[0-9a-f]{40}$/;
const deny=()=>{throw new Error("PAY54_EVIDENCE_PRIVACY_DENIED");};
export function redactedPay54EvidenceSummary({
 correlationId,sourceSha,evidenceClass,classification
}={}){
 if(!SAFE.test(correlationId??"")||!SHA.test(sourceSha??"")||
    !["PAGES","IAM","DATABASE","IDENTITY","PROVIDER"].includes(evidenceClass)||
    !["NOT_VERIFIED","POTENTIAL_RISK","SOURCE_CHECK_PASSED"].includes(classification))deny();
 return Object.freeze({
  schema:"pay54.redacted-operator-evidence-report.v1",
  correlationId,sourceSha,evidenceClass,classification,
  includesPrivateSourceBytes:false,
  includesProviderSecrets:false,
  includesCustomerIdentity:false,
  incidentClosureAuthorised:false,
  releaseAuthorised:false
 });
}
