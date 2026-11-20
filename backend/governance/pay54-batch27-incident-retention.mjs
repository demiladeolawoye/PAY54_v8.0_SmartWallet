"use strict";
/** Batch27/1124 — incident evidence retention requires explicit legal purpose. */
const deny=()=>{throw Error("PAY54_INCIDENT_EVIDENCE_RETENTION_DENIED");};
const PURPOSE=new Set(["SECURITY_INVESTIGATION",
 "REGULATORY_REPORTING","DATA_PROTECTION_RESPONSE"]);
export function inspectPay54IncidentRetentionPolicy({
 purpose,retentionDays,accessRestricted,
 immutableAudit,customerDataIncluded
}={}){
 if(!PURPOSE.has(purpose)||
    !Number.isInteger(retentionDays)||retentionDays<1||
    retentionDays>3650 ||accessRestricted!==true||
    immutableAudit!==true||customerDataIncluded!==false)deny();
 return Object.freeze({
  schema:"pay54.incident-evidence-retention-v1",
  purpose,retentionDays,
  sensitiveEvidenceAccessRestricted:true,
  legalRetentionReviewStillRequired:true,
  actualEvidenceStorageNotProvisioned:true,
  customerDataIncluded:false,
  incidentClosed:false
 });
}
