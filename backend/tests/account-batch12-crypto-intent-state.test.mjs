"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {
 newCryptoIntent,transitionCryptoIntent,CRYPTO_EXECUTION_GATE
} from "../domain/crypto-intent-state.mjs";
const id="crypto-intent-2026-0001";
const expires=200000;
const makeEvent=(intent,to,actor,n=1)=>transitionCryptoIntent(intent,{
 to,actor,eventId:"crypto-event-"+String(n).padStart(10,"0"),
 quoteExpiresAt:expires,observedAt:1000+n,
 providerReference:"provider-order-001234567890",
 settlementReference:"provider-settlement-001234567890"
});
test("316: quote -> confirm -> provider -> settle requires all stages",()=>{
 let intent=newCryptoIntent({id});
 assert.equal(intent.state,"QUOTED");
 assert.ok(Object.isFrozen(intent));
 intent=makeEvent(intent,"CUSTOMER_CONFIRMED","customer",1);
 intent=makeEvent(intent,"PROVIDER_SUBMITTED","system",2);
 intent=makeEvent(intent,"PROVIDER_EXECUTED","provider",3);
 intent=makeEvent(intent,"SETTLEMENT_PENDING","provider",4);
 intent=makeEvent(intent,"SETTLED","reconciliation",5);
 assert.equal(intent.state,"SETTLED");
 assert.equal(intent.events.length,5);
 assert.throws(()=>makeEvent(intent,"PROVIDER_SUBMITTED","system",6),
 /PAY54_CRYPTO_INTENT_TRANSITION_DENIED/);
 assert.equal(CRYPTO_EXECUTION_GATE.liveProviderCallsEnabled,false);
 assert.equal(CRYPTO_EXECUTION_GATE.customerFundsMovementEnabled,false);
 assert.equal(CRYPTO_EXECUTION_GATE.productionRelease,"BLOCKED");
});
test("316: expiry and missing customer confirmation fail closed",()=>{
 const intent=newCryptoIntent({id});
 assert.throws(()=>transitionCryptoIntent(intent,{
  to:"CUSTOMER_CONFIRMED",actor:"customer",
  eventId:"crypto-event-expired-001",
  observedAt:expires,quoteExpiresAt:expires
 }),/PAY54_CRYPTO_QUOTE_EXPIRED/);
 assert.throws(()=>makeEvent(intent,"CUSTOMER_CONFIRMED","system",20),
 /PAY54_CRYPTO_CUSTOMER_CONFIRMATION_REQUIRED/);
});
test("316: provider execution cannot bypass allowed transition or evidence",()=>{
 let intent=newCryptoIntent({id});
 intent=makeEvent(intent,"CUSTOMER_CONFIRMED","customer",1);
 assert.throws(()=>makeEvent(intent,"SETTLED","reconciliation",2),
 /PAY54_CRYPTO_INTENT_TRANSITION_DENIED/);
 assert.throws(()=>transitionCryptoIntent(intent,{
  to:"PROVIDER_SUBMITTED",actor:"system",eventId:"crypto-event-0000000002",
  observedAt:1002,quoteExpiresAt:expires
 }),/PAY54_CRYPTO_PROVIDER_REFERENCE_MISSING/);
});
test("316: actor spoof and duplicate event ID fail closed",()=>{
 let intent=newCryptoIntent({id});
 intent=makeEvent(intent,"CUSTOMER_CONFIRMED","customer",1);
 assert.throws(()=>makeEvent(intent,"PROVIDER_SUBMITTED","provider",2),
 /PAY54_CRYPTO_ACTOR_DENIED/);
 assert.throws(()=>makeEvent(intent,"PROVIDER_SUBMITTED","system",1),
 /PAY54_CRYPTO_INTENT_EVENT_REPLAY/);
});
test("316: no settlement without independently supplied reconciliation reference",()=>{
 let intent=newCryptoIntent({id});
 intent=makeEvent(intent,"CUSTOMER_CONFIRMED","customer",1);
 intent=makeEvent(intent,"PROVIDER_SUBMITTED","system",2);
 intent=makeEvent(intent,"PROVIDER_EXECUTED","provider",3);
 intent=makeEvent(intent,"SETTLEMENT_PENDING","provider",4);
 assert.throws(()=>transitionCryptoIntent(intent,{
  to:"SETTLED",actor:"reconciliation",
  eventId:"crypto-event-0000000005",
  observedAt:1005,quoteExpiresAt:expires,
  providerReference:"provider-order-001234567890"
 }),/PAY54_CRYPTO_SETTLEMENT_EVIDENCE_MISSING/);
});
test("316: malformed IDs and mutable/corrupt histories rejected",()=>{
 assert.throws(()=>newCryptoIntent({id:"short"}),
 /PAY54_CRYPTO_INTENT_ID_INVALID/);
 assert.throws(()=>transitionCryptoIntent({id,state:"QUOTED",events:[{}]},{
  to:"CANCELLED",eventId:"crypto-event-0000000001",
  actor:"customer",observedAt:10,quoteExpiresAt:100
 }),/PAY54_CRYPTO_INTENT_TRANSITION_INVALID/);
});
