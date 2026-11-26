"use strict";
/**
 * Pure staging admission preflight; this is not an infrastructure provisioner.
 */
const GATES=["finalGbpQuote","storageBackupNetworkPriced","explicitSpendApproval",
 "isolatedServiceIdentity","tlsVerified","secretsLifecycleReviewed",
 "auditAndMonitoring","backupRestoreRehearsal","dbRollbackRehearsal",
 "independentSecurityApproval"];
export function assessStagingAdmission(evidence){
 if(!evidence||typeof evidence!=="object"||Array.isArray(evidence))
  throw new TypeError("PAY54_W2_STAGING_EVIDENCE_REQUIRED");
 const incomplete=GATES.filter(x=>evidence[x]!==true);
 return Object.freeze({
  schema:"pay54.wave2.staging-admission.v1",
  missing:Object.freeze(incomplete),
  status:incomplete.length?"NO_GO":"SEPARATE_SPENDING_AUTHORISATION_REQUIRED",
  provisionRequested:false,
  provisionAuthorised:false,
  cloudSpendingAuthorised:false,
  productionAuthorised:false
 });
}
