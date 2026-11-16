"use strict";

/*
 * PAY54 Batch 12 item 315 — crypto intent lifecycle, source-only.
 * An immutable, deterministic transition validator for a FUTURE regulated
 * partner-backed crypto service. No IO, API calls, payment authorisation,
 * customer data access, key management, transfer signing or balance writes.
 */
const STATES=Object.freeze([
 "QUOTED","CUSTOMER_CONFIRMED","COMPLIANCE_HOLD","PROVIDER_SUBMITTED",
 "PROVIDER_EXECUTED","SETTLEMENT_PENDING","SETTLED",
 "EXPIRED","FAILED","RECONCILIATION_REQUIRED","CANCELLED"
]);
const allowed=Object.freeze({
 QUOTED:["CUSTOMER_CONFIRMED","EXPIRED","CANCELLED"],
 CUSTOMER_CONFIRMED:["COMPLIANCE_HOLD","PROVIDER_SUBMITTED","FAILED","EXPIRED"],
 COMPLIANCE_HOLD:["PROVIDER_SUBMITTED","FAILED","CANCELLED"],
 PROVIDER_SUBMITTED:["PROVIDER_EXECUTED","RECONCILIATION_REQUIRED","FAILED"],
 PROVIDER_EXECUTED:["SETTLEMENT_PENDING","RECONCILIATION_REQUIRED"],
 SETTLEMENT_PENDING:["SETTLED","RECONCILIATION_REQUIRED"],
 RECONCILIATION_REQUIRED:["SETTLEMENT_PENDING","FAILED"],
 SETTLED:[],EXPIRED:[],FAILED:[],CANCELLED:[]
});
const SHA=/^[a-zA-Z0-9_-]{12,96}$/;
function validString(value){return typeof value==="string"&&SHA.test(value);}
const PROVIDER_STATES=new Set([
 "PROVIDER_SUBMITTED","PROVIDER_EXECUTED","SETTLEMENT_PENDING","SETTLED"
]);
export function transitionCryptoIntent(intent,{
  to,eventId,actor="system",providerReference,settlementReference,
  quoteExpiresAt,observedAt
}={}){
 if(!intent||typeof intent!=="object"||Array.isArray(intent)||
    !validString(intent.id)||!STATES.includes(intent.state)||
    !Array.isArray(intent.events)||intent.events.length>200||
    intent.events.some(e=>!e||!validString(e.eventId))||
    !STATES.includes(to)||!validString(eventId)||
    !["system","customer","compliance","provider","reconciliation"].includes(actor)||
    !Number.isSafeInteger(observedAt)||observedAt<0||
    !Number.isSafeInteger(quoteExpiresAt)||quoteExpiresAt<=0){
  throw new Error("PAY54_CRYPTO_INTENT_TRANSITION_INVALID");
 }
 if(intent.events.some(e=>e.eventId===eventId)){
  throw new Error("PAY54_CRYPTO_INTENT_EVENT_REPLAY");
 }
 if(!allowed[intent.state].includes(to)){
  throw new Error("PAY54_CRYPTO_INTENT_TRANSITION_DENIED");
 }
 if(intent.state==="QUOTED"&&to==="CUSTOMER_CONFIRMED"&&
    observedAt>=quoteExpiresAt){
  throw new Error("PAY54_CRYPTO_QUOTE_EXPIRED");
 }
 if(to==="CUSTOMER_CONFIRMED"&&actor!=="customer"){
  throw new Error("PAY54_CRYPTO_CUSTOMER_CONFIRMATION_REQUIRED");
 }
 if(to==="COMPLIANCE_HOLD"&&actor!=="compliance"||
    to==="PROVIDER_SUBMITTED"&&actor!=="system"||
    to==="PROVIDER_EXECUTED"&&actor!=="provider"||
    to==="SETTLED"&&actor!=="reconciliation"){
  throw new Error("PAY54_CRYPTO_ACTOR_DENIED");
 }
 if(PROVIDER_STATES.has(to)&&!validString(providerReference)){
  throw new Error("PAY54_CRYPTO_PROVIDER_REFERENCE_MISSING");
 }
 if(to==="SETTLED"&&(!validString(settlementReference)||
    intent.state!=="SETTLEMENT_PENDING")){
  throw new Error("PAY54_CRYPTO_SETTLEMENT_EVIDENCE_MISSING");
 }
 if(to==="SETTLED"&&(!intent.events.some(e=>e.to==="PROVIDER_EXECUTED")||
     !intent.events.some(e=>e.to==="SETTLEMENT_PENDING"))){
  throw new Error("PAY54_CRYPTO_SETTLEMENT_LIFECYCLE_INCOMPLETE");
 }
 const event=Object.freeze({
  eventId,from:intent.state,to,actor,observedAt,
  providerReference:validString(providerReference)?providerReference:null,
  settlementReference:validString(settlementReference)?settlementReference:null
 });
 return Object.freeze({
  id:intent.id,state:to,
  events:Object.freeze([...intent.events,event])
 });
}
export function newCryptoIntent({id}={}){
 if(!validString(id))throw new Error("PAY54_CRYPTO_INTENT_ID_INVALID");
 return Object.freeze({id,state:"QUOTED",events:Object.freeze([])});
}
export const CRYPTO_EXECUTION_GATE=Object.freeze({
  liveProviderCallsEnabled:false,
  cryptocurrencyTransferSigningEnabled:false,
  customerFundsMovementEnabled:false,
  productionRelease:"BLOCKED"
});
