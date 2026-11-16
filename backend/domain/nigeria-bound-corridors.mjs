"use strict";

/*
 * PAY54 Batch 12 / 317 — immutable source-only Nigeria-bound corridor registry.
 * The existence of a corridor MUST NEVER be interpreted as legal permission,
 * provider coverage, confirmed liquidity, or an executable feature flag.
 */
const REGISTRY=Object.freeze([
 ["GB","GBP","United Kingdom","INITIAL_CANDIDATE"],
 ["US","USD","United States","EXPANSION_CANDIDATE"],
 ["DE","EUR","Germany","EXPANSION_CANDIDATE"],
 ["FR","EUR","France","EXPANSION_CANDIDATE"],
 ["NL","EUR","Netherlands","EXPANSION_CANDIDATE"],
 ["ES","EUR","Spain","EXPANSION_CANDIDATE"],
 ["IE","EUR","Ireland","EXPANSION_CANDIDATE"],
 ["CA","CAD","Canada","EXPANSION_CANDIDATE"],
 ["AU","AUD","Australia","EXPANSION_CANDIDATE"],
 ["SG","SGD","Singapore","RESEARCH_CANDIDATE"],
 ["AE","AED","United Arab Emirates","RESEARCH_CANDIDATE"],
 ["JP","JPY","Japan","RESEARCH_CANDIDATE"]
].map(([origin,currency,label,priority])=>Object.freeze({
 id:origin+"-NG",origin,destination:"NG",sourceCurrency:currency,
 destinationCurrency:"NGN",label,priority,executionEnabled:false,
 legalReviewComplete:false,providerContractVerified:false,
 payoutRailApproved:false,settlementReconciled:false
})));
const BY_ID=new Map(REGISTRY.map(c=>[c.id,c]));
function normalizeMarket(value){
 return typeof value==="string"&&/^[A-Z]{2}$/.test(value.trim().toUpperCase())
  ?value.trim().toUpperCase():null;
}
export function listNigeriaBoundCorridors(){
 return REGISTRY;
}
export function getNigeriaBoundCorridor(origin,destination="NG"){
 const start=normalizeMarket(origin),end=normalizeMarket(destination);
 return end==="NG"?BY_ID.get(start+"-NG")??null:null;
}
export function assessNigeriaBoundCorridor(origin,destination="NG"){
 const corridor=getNigeriaBoundCorridor(origin,destination);
 return Object.freeze({
  corridorId:corridor?.id??null,
  candidate:!!corridor,
  sourceCurrency:corridor?.sourceCurrency??null,
  destinationCurrency:corridor?.destinationCurrency??null,
  available:false,executable:false,livePartnerAuthorised:false,
  reasons:Object.freeze(corridor?[
   "CONTRACTED_ORIGIN_PROVIDER_NOT_VERIFIED",
   "NIGERIA_PAYOUT_AND_SETTLEMENT_NOT_VERIFIED",
   "REGULATORY_AND_COMPLIANCE_GATES_OPEN",
   "CUSTOMER_AND_COUNTRY_ELIGIBILITY_NOT_VERIFIED",
   "RELEASE_NOT_AUTHORISED"
  ]:["CORRIDOR_NOT_IN_REVIEWED_CANDIDATE_SET"])
 });
}
