"use strict";
/** Batch27/1089 — composite source staging evidence cannot turn on runtime. */
const CHECKS=Object.freeze([
 "identity-provider-contract","mfa-customer-recovery",
 "four-distinct-postgres-logins","tls-and-rls-proven",
 "ordered-migrations-001-020","pitr-restore-rehearsal",
 "distributed-atomic-auth-limiter","account-device-qa",
 "source-artifact-provenance","protected-deployer-oidc"]);
const deny=()=>{throw new Error("PAY54_STAGING_ACCEPTANCE_REVIEW_DENIED");};
export function assessPay54StagingAcceptanceClaims({claims}={}){
 if(!claims||typeof claims!=="object"||Array.isArray(claims)||
    Object.keys(claims).length!==CHECKS.length ||
    Object.keys(claims).some(key=>!CHECKS.includes(key)))deny();
 const missing=CHECKS.filter(key=>claims[key]!==true);
 return Object.freeze({
  schema:"pay54.staging-gate-evidence-inventory.v1",
  requiredCategoryCount:CHECKS.length,
  claimedCompleteCount:CHECKS.length-missing.length,
  missingEvidenceCategories:Object.freeze(missing),
  structurallyReadyForIndependentValidation:missing.length===0,
  contractsIndependentlyAuthenticated:false,
  customerLoginEnabled:false,
  stagingEnvironmentActuallyVerified:false,
  stagingProvisioningAuthorised:false,
  productionReleaseAuthorised:false
 });
}
