"use strict";
/** Batch27/1093 — regulated UK-NG rail approvals require separate domains. */
const ROLES=Object.freeze(["uk-inbound","global-fx-backbone",
 "ng-primary-payout","ng-secondary-payout"]);
const APPROVALS=Object.freeze(["legal","aml","safeguarding",
 "finance-reconciliation","security","provider-owner"]);
const deny=()=>{throw new Error("PAY54_UK_NG_RAIL_SIGNOFF_DENIED");};
export function inspectPay54UkNigeriaPartnerSignoffs({rails}={}){
 if(!Array.isArray(rails)||rails.length!==ROLES.length)deny();
 const seen=new Set(),providers=new Set(),missing=[];
 for(const r of rails){
  if(!r||!ROLES.includes(r.role)||seen.has(r.role)||
     typeof r.providerId!=="string" ||
     !/^[a-z0-9][a-z0-9.-]{4,95}$/.test(r.providerId) ||
     providers.has(r.providerId)||!r.approvals||typeof r.approvals!=="object"||
     Array.isArray(r.approvals) ||
     Object.keys(r.approvals).some(k=>!APPROVALS.includes(k)))deny();
  seen.add(r.role);providers.add(r.providerId);
  for(const area of APPROVALS)if(r.approvals[area]!==true)
   missing.push(r.role+":"+area);
 }
 if(seen.size!==ROLES.length)deny();
 return Object.freeze({
  schema:"pay54.uk-ng-partner-signoff-inventory.v1",
  distinctRailRoles:4,requiredSignoffs:24,
  claimedMissingSignoffs:Object.freeze(missing),
  contractualFactsIndependentlyVerified:false,
  actualFinancialRailsActivated:false,
  productionSettlementAuthorised:false
 });
}
