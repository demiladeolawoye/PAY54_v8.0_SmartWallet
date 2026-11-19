"use strict";

/**
 * PAY54 Batch 25 / 999 — card/PSP replacement acceptance inventory.
 *
 * A self-declared provider capability cannot authorise funds or remove the
 * development-provider block. Actual licensure, contract, PCI, SCA, dispute
 * handling and safeguarding evidence must be reviewed independently.
 */
const CHECKS=Object.freeze([
 "contract-executed",
 "regulatory-permissions-verified",
 "pci-dss-scope-accepted",
 "sca-3ds2-integrated",
 "chargebacks-and-refunds-tested",
 "idempotent-capture-and-reversal-tested",
 "settlement-reconciliation-tested",
 "safeguarding-and-funds-flow-approved",
 "incident-and-operational-sla-approved",
 "provider-sandbox-negative-tests"
]);
const ID=/^[a-z][a-z0-9.-]{5,99}$/;
const HASH=/^[0-9a-f]{64}$/;
const deny=()=>{throw new Error("PAY54_PROVIDER_ACCEPTANCE_INVALID");};

export function assessPay54CardProviderAcceptance({
 providerId,providerType,evidenceDigests={}
}={}){
 if(typeof providerId!=="string" || !ID.test(providerId) ||
    !["development","regulated-psp"].includes(providerType) ||
    !evidenceDigests || typeof evidenceDigests!=="object" ||
    Array.isArray(evidenceDigests) ||
    Object.keys(evidenceDigests).some(key=>!CHECKS.includes(key)) )deny();
 const missing=CHECKS.filter(name=>!Object.hasOwn(evidenceDigests,name) ||
   typeof evidenceDigests[name]!=="string" ||
   !HASH.test(evidenceDigests[name]));
 const development=providerType==="development" ||
   providerId.includes("development") ||
   providerId.includes("sandbox");
 return Object.freeze({
  schema:"pay54.provider-acceptance-evidence-inventory.v1",
  providerId,
  providerType,
  expectedEvidenceCategories:CHECKS.length,
  validEvidenceDigestCount:CHECKS.length-missing.length,
  missingCategories:Object.freeze(missing),
  developmentProviderQuarantined:development,
  evidenceContentsIndependentlyVerified:false,
  regulatoryPartnerContractIndependentlyVerified:false,
  paymentExecutionAuthorised:false,
  productionCardFundingEnabled:false,
  candidateReadyForHumanReview:!development && missing.length===0
 });
}
