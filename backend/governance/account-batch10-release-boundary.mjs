"use strict";
import {assessBatch10Source,loadBatch10Source} from "./account-batch10-source-audit.mjs";

/*
 * PAY54 Batch 10 item 255 — offline nonactivation gate.
 * Automated regression passes alone cannot authorise staging, customer
 * SELECT, cloud, payment execution, Pages publishing or production release.
 * This gate is intentionally source-only and is not a deployed release guard.
 */
const REQUIRED_RELEASE_APPROVALS=Object.freeze([
 "independentDatabaseCredentialCustody",
 "independentCustomerRlsReview",
 "durableAuditInfrastructure",
 "independentPenetrationTest",
 "cloudNetworkEgressReview",
 "regulatoryAndPartnerApproval",
 "founderSignedProductionRelease"
]);

export function assessBatch10ReleaseBoundary({sourceAudit,approvedReleaseEvidence}={}){
 if(!sourceAudit || typeof sourceAudit!=="object" ||
    sourceAudit.passed!==true ||
    sourceAudit.liveCredentialAttested!==false ||
    sourceAudit.customerDataAccessEnabled!==false ||
    sourceAudit.financialExecutionEnabled!==false ||
    sourceAudit.productionRelease!=="BLOCKED"){
  throw new Error("BATCH10_RELEASE_SOURCE_UNTRUSTED");
 }
 // A source-only batch cannot self-approve a real environment, even if its
 // caller fabricates a complete list of release approvals.
 const submitted=approvedReleaseEvidence&&
  typeof approvedReleaseEvidence==="object"?
   REQUIRED_RELEASE_APPROVALS.filter(k=>approvedReleaseEvidence[k]===true):[];
 return Object.freeze({
  sourceSecurityChecksPassed:true,
  evidenceClaimsSubmitted:submitted.length,
  independentEvidenceVerified:false,
  deploymentApproved:false,
  productionRelease:"BLOCKED",
  stagingRelease:"BLOCKED",
  liveCustomerSelectEnabled:false,
  paymentExecutionEnabled:false,
  cloudProvisioningEnabled:false,
  pagesPublicationApproved:false,
  remainingApprovalClasses:REQUIRED_RELEASE_APPROVALS
 });
}
export function assessCurrentBatch10ReleaseBoundary(){
 return assessBatch10ReleaseBoundary({
  sourceAudit:assessBatch10Source(loadBatch10Source())
 });
}
