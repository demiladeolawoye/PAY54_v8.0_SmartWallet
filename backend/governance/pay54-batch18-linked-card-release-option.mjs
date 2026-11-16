"use strict";

/**
 * PAY54 Batch 18 item 625 — linked-card production release change assessment.
 *
 * Formalises independent operational acceptance without treating UI hiding as
 * server-side protection. Does not select/replace a provider, modify finance
 * code, or enable any transaction.
 */
const CHOICES=new Set(["APPROVED_PROVIDER","FEATURE_GATED_PUBLIC_PREVIEW"]);
const SHA=/^[a-f0-9]{40}$/;
const CONTROLS=[
 "providerContractSigned",
 "partnerComplianceApproved",
 "backendAuthorizationEnforced",
 "fundingIdempotencyVerified",
 "reconciliationAcceptancePassed",
 "fullFundingRegressionPassed",
 "frontendCapabilityGateTested",
 "independentSecurityReview",
 "rollbackVerified"
];
export function assessPay54LinkedCardReleaseOption(input={}){
 if(!input||typeof input!=="object"||Array.isArray(input)){
  throw new TypeError("PAY54_CARD_RELEASE_OPTION_OBJECT_REQUIRED");
 }
 const choice=CHOICES.has(input.option)?input.option:"UNSELECTED";
 const findings=[];
 if(choice==="UNSELECTED")findings.push("APPROVED_OPTION_MISSING");
 if(!SHA.test(input.reviewedCommitSha??"")){
  findings.push("REVIEWED_SOURCE_SHA_MISSING");
 }
 for(const control of CONTROLS){
  if(input[control]!==true)findings.push("CONTROL_NOT_EVIDENCED_"+control.toUpperCase());
 }
 if(choice==="FEATURE_GATED_PUBLIC_PREVIEW"){
  if(input.linkedCardExecutionDisabledOnServer!==true){
   findings.push("SERVER_SIDE_LINKED_CARD_DISABLE_UNVERIFIED");
  }
  if(input.otherFundingSourcesRegressionPassed!==true){
   findings.push("OTHER_FUNDING_SOURCES_REGRESSION_UNVERIFIED");
  }
 }
 if(choice==="APPROVED_PROVIDER"){
  if(input.providerIdentityVerified!==true){
   findings.push("PROVIDER_IDENTITY_NOT_VERIFIED");
  }
  if(input.productionProviderAdapterReviewed!==true){
   findings.push("PRODUCTION_PROVIDER_ADAPTER_NOT_REVIEWED");
  }
 }
 // All inputs are operator assertions, not externally attested facts.
 return Object.freeze({
  schema:"pay54.linked-card-release-decision.v1",
  requestedOption:choice,
  missingEvidence:Object.freeze(findings),
  evidencePacketComplete:findings.length===0,
  evidenceIndependentlyAuthenticated:false,
  currentProductionProviderVerified:false,
  currentPaymentsEnabled:false,
  providerOrFeatureChangeApplied:false,
  siteDeploymentApproved:false,
  productionRelease:"BLOCKED"
 });
}
