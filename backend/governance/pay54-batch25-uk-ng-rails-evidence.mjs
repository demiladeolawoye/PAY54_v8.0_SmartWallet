"use strict";

/**
 * PAY54 Batch 25 / 1001 — UK→Nigeria partner orchestration evidence screen.
 *
 * Distinct rail adapters are required for resilience. No PSP, FX, payout or
 * safeguarding contract is claimed; only supplied document fingerprints are
 * structurally screened. This cannot authorise financial execution.
 */
const ID=/^[a-z][a-z0-9.-]{4,95}$/;
const DIGEST=/^[0-9a-f]{64}$/;
const ROLE=Object.freeze([
 "uk-inbound","crossborder-backbone",
 "ng-payout-primary","ng-payout-secondary"
]);
const EVIDENCE=Object.freeze([
 "executed-contract","regulated-permission",
 "aml-sanctions-kyt","safeguarding-funds-flow",
 "fx-quote-expiry","settlement-reconciliation",
 "webhook-authentication","refund-disputes",
 "outage-failover","data-residency-and-dpa"
]);
const deny=()=>{throw new Error("PAY54_CORRIDOR_PARTNER_EVIDENCE_DENIED");};

export function inspectPay54UkNigeriaRailReadiness({
 providers
}={}){
 if(!Array.isArray(providers) || providers.length!==4)deny();
 const byRole=new Map(),ids=new Set();
 for(const provider of providers){
  if(!provider || typeof provider!=="object" ||
     !ROLE.includes(provider.role) ||
     typeof provider.providerId!=="string" ||
     !ID.test(provider.providerId) ||
     ids.has(provider.providerId) || byRole.has(provider.role) ||
     provider.providerId.includes("development") ||
     !provider.evidenceDigests ||
     typeof provider.evidenceDigests!=="object" ||
     Array.isArray(provider.evidenceDigests) ||
     Object.keys(provider.evidenceDigests).some(key=>!EVIDENCE.includes(key)))
    deny();
  ids.add(provider.providerId);
  byRole.set(provider.role,provider);
 }
 if(ROLE.some(role=>!byRole.has(role)))deny();
 const missing=[];
 for(const role of ROLE){
  const e=byRole.get(role).evidenceDigests;
  for(const category of EVIDENCE){
   if(!Object.hasOwn(e,category) || !DIGEST.test(e[category]))
    missing.push(role+":"+category);
  }
 }
 return Object.freeze({
  schema:"pay54.uk-ng-rail-acceptance-inventory.v1",
  distinctPartnerRoleCount:byRole.size,
  requiredEvidenceCount:ROLE.length*EVIDENCE.length,
  missingEvidence:Object.freeze(missing),
  structurallyCompleteForIndependentReview:missing.length===0,
  actualProviderContractsVerified:false,
  safeguardsAndLicensingIndependentlyApproved:false,
  payoutFailoverOperationallyVerified:false,
  liveFinancialExecutionAuthorised:false
 });
}
