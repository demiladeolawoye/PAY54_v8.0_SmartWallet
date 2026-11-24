"use strict";
/**
 * Batch 45: untrusted evidence admission. This validator never establishes
 * that a live PostgreSQL connection or a positive financial writer exists.
 */
const REQUIRED=Object.freeze([
 "postgresVersion", "environment", "connectionIdentity",
 "effectiveWriterRole", "writerRoleVerified", "writerFunctionsVerified",
 "postMigrationReserveVerified", "postMigrationCaptureVerified",
 "postMigrationReleaseVerified", "postMigrationReversalVerified",
 "idempotencyVerified", "noOverspendVerified", "crossTenantDenied",
 "outboxAtomicityVerified", "rollbackVerified", "dbaApproval",
 "securityApproval", "auditRunId"
]);
export const PAY54_WRITER_ADMISSION_FIELDS=REQUIRED;
export function evaluatePay54WriterEvidence(evidence){
 if(!evidence||typeof evidence!=="object"||Array.isArray(evidence))throw new TypeError("PAY54_B45_EVIDENCE_OBJECT_REQUIRED");
 const missing=REQUIRED.filter(k=>!Object.hasOwn(evidence,k));
 const invalid=[];
 for(const key of REQUIRED.filter(x=>x.endsWith("Verified")||x.endsWith("Denied")||x.endsWith("Approval"))){
  if(Object.hasOwn(evidence,key)&&typeof evidence[key]!=="boolean")invalid.push(key);
 }
 for(const key of ["postgresVersion","environment","connectionIdentity","effectiveWriterRole","auditRunId"]){
  if(Object.hasOwn(evidence,key)&&(typeof evidence[key]!=="string"||!evidence[key].trim()))invalid.push(key);
 }
 if(Object.hasOwn(evidence,"postgresVersion")&&evidence.postgresVersion!=="16")invalid.push("postgresVersion");
 if(Object.hasOwn(evidence,"environment")&&evidence.environment!=="DISPOSABLE_CI")invalid.push("environment");
 const outcomes=REQUIRED.filter(k=>k.endsWith("Verified")||k.endsWith("Denied")||k.endsWith("Approval"));
 const unproven=outcomes.filter(k=>evidence[k]!==true);
 const fullEvidence=missing.length===0&&invalid.length===0&&unproven.length===0;
 return Object.freeze({
  schema:"pay54.financial-writer-positive-admission.v1",
  status:fullEvidence?"HUMAN_REVIEW_REQUIRED":"POSITIVE_WRITER_EVIDENCE_MISSING",
  missing:Object.freeze(missing),
  invalid:Object.freeze(invalid),
  unproven:Object.freeze(unproven),
  selfReportedComplete:fullEvidence,
  evidenceAuthenticityVerified:false,
  actualManagedConnectionVerified:false,
  realPartnerSettlementVerified:false,
  cloudSpendingAuthorized:false,
  managedStagingAuthorized:false,
  productionAuthorized:false
 });
}
