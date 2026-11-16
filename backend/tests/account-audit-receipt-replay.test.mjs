"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createAccountAuditReceiptGate} from "../security/account-audit-receipt-gate.mjs";

const A="11111111-1111-4111-8111-111111111111";
const B="22222222-2222-4222-8222-222222222222";
const event={operation:"ACCOUNT_SELECT",outcome:"ALLOWED",reason:"POLICY_OK"};
test("247: repeat event IDs are rejected before sink receives a second write",async()=>{
 let writes=0;
 const gate=createAccountAuditReceiptGate({
  makeId:()=>A,emit:async e=>{
   writes++;
   return {eventId:e.eventId,accepted:true,persistenceConfirmed:true};
  }
 });
 await gate.publish(event);
 await assert.rejects(()=>gate.publish(event),/ACCOUNT_AUDIT_RECEIPT_DENIED/);
 assert.equal(writes,1);
});
test("247: failed write cannot be replayed with same ID",async()=>{
 let writes=0;
 const gate=createAccountAuditReceiptGate({
  makeId:()=>A,emit:async()=>{writes++;throw new Error("outage");}
 });
 await assert.rejects(()=>gate.publish(event),/ACCOUNT_AUDIT_UNAVAILABLE/);
 await assert.rejects(()=>gate.publish(event),/ACCOUNT_AUDIT_RECEIPT_DENIED/);
 assert.equal(writes,1);
});
test("247: bounded in-memory event budget fails closed rather than evicting",async()=>{
 let i=0;
 const gate=createAccountAuditReceiptGate({
  maxEvents:1,makeId:()=>i++===0?A:B,
  emit:async e=>({eventId:e.eventId,accepted:true,persistenceConfirmed:true})
 });
 await gate.publish(event);
 await assert.rejects(()=>gate.publish(event),/ACCOUNT_AUDIT_RECEIPT_DENIED/);
 assert.throws(()=>createAccountAuditReceiptGate({
  emit:async()=>{},maxEvents:0
 }),/ACCOUNT_AUDIT_RECEIPT_CONFIG_INVALID/);
});
test("247: concurrent duplicate publishes cannot both reach sink",async()=>{
 let writes=0,release;
 const barrier=new Promise(resolve=>{release=resolve;});
 const gate=createAccountAuditReceiptGate({
  makeId:()=>A,emit:async e=>{
   writes++;await barrier;
   return {eventId:e.eventId,accepted:true,persistenceConfirmed:true};
  }
 });
 const first=gate.publish(event);
 await assert.rejects(()=>gate.publish(event),/ACCOUNT_AUDIT_RECEIPT_DENIED/);
 release();
 assert.equal((await first).receiptAccepted,true);
 assert.equal(writes,1);
});
