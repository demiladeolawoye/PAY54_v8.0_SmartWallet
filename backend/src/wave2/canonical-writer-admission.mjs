"use strict";
/**
 * PAY54 Wave2 — canonical writer admission boundary.
 * This module NEVER executes financial SQL, emits financial authorisation,
 * or treats an application-level session read as a commit barrier.
 */
export const CANONICAL_FINANCIAL_FUNCTIONS=Object.freeze({
 reserve:"pay54.reserve_wallet_transfer(uuid,uuid,uuid,bigint,text,text,timestamp with time zone)",
 capture:"pay54.capture_reserved_wallet_transfer(uuid,uuid)",
 release:"pay54.release_reserved_wallet_transfer(uuid,uuid,text)"
});
const REQUIRED=Object.freeze([
 "sameTransactionSessionRowLock",
 "databaseAttestedPrincipalAndMembership",
 "revokerUsesIdenticalRowLock",
 "leastPrivilegeEffectiveRole",
 "forceRlsWriterPolicyApproved",
 "positiveCanonicalReserve",
 "positiveCanonicalCapture",
 "positiveCanonicalRelease",
 "idempotencyAndOutboxAtomicity",
 "concurrentFinancialRevocationProven",
 "negativeCrossTenantAndOverspendTests",
 "rollbackRehearsalVerified",
 "independentSecurityReview",
 "independentDbaReview"
]);
export function evaluateCanonicalWriterAdmission(evidence){
 if(!evidence||typeof evidence!=="object"||Array.isArray(evidence))throw new TypeError("PAY54_W2_EVIDENCE_OBJECT_REQUIRED");
 const missing=REQUIRED.filter(k=>evidence[k]!==true);
 const unsupported=Object.keys(evidence).filter(k=>!REQUIRED.includes(k));
 return Object.freeze({
  schema:"pay54.wave2.canonical-writer-admission.v1",
  requirements:Object.freeze([...REQUIRED]),
  missing:Object.freeze(missing),
  unsupported:Object.freeze(unsupported),
  selfReportedComplete:missing.length===0,
  status:missing.length?"NO_GO":"INDEPENDENT_ATTESTATION_REQUIRED",
  canonicalWriterPositiveVerified:false,
  financialExecutionEnabled:false,
  sourceMergeAuthorised:false,
  managedStagingAuthorised:false,
  productionAuthorised:false
 });
}
