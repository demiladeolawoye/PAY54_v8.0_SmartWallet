"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createAccountAuditReceiptGate} from "../security/account-audit-receipt-gate.mjs";

const ID="11111111-1111-4111-8111-111111111111";
function validReceipt(event){
 return {eventId:event.eventId,accepted:true,persistenceConfirmed:true};
}
test("231: full matching receipt acknowledges minimal immutable event only",async()=>{
 let captured;
 const gate=createAccountAuditReceiptGate({
  makeId:()=>ID,
  emit:async event=>{captured=event;return validReceipt(event);}
 });
 const result=await gate.publish({
  operation:"ACCOUNT_SELECT",outcome:"ALLOWED",reason:"POLICY_OK"
 });
 assert.equal(result.eventId,ID);
 assert.equal(result.receiptAccepted,true);
 assert.equal(result.durableStorageIndependentlyVerified,false);
 assert.equal(result.financialExecutionEnabled,false);
 assert.equal(captured.financialExecutionEnabled,false);
 assert.ok(Object.isFrozen(captured));
 assert.deepEqual(Object.keys(captured).sort(),[
  "eventId","financialExecutionEnabled","operation","outcome","reason","schema"
 ].sort());
});
test("231: unset, false, mismatched or enriched receipts cannot authorize disclosure",async()=>{
 for(const returned of [
  undefined,null,false,true,{}, {accepted:true,persistenceConfirmed:true},
  {eventId:ID,accepted:false,persistenceConfirmed:true},
  {eventId:ID,accepted:true,persistenceConfirmed:false},
  {eventId:"22222222-2222-4222-8222-222222222222",
   accepted:true,persistenceConfirmed:true},
  {eventId:ID,accepted:true,persistenceConfirmed:true,token:"should-not-be-in-receipt"}
 ]){
  const gate=createAccountAuditReceiptGate({makeId:()=>ID,emit:async()=>returned});
  await assert.rejects(()=>gate.publish({
   operation:"ACCOUNT_SELECT",outcome:"ALLOWED",reason:"POLICY_OK"
  }),/ACCOUNT_AUDIT_UNAVAILABLE/);
 }
});
test("231: invalid event, forged event ID or sink outage fail closed",async()=>{
 const gate=createAccountAuditReceiptGate({
  makeId:()=>ID,emit:async e=>validReceipt(e)
 });
 for(const patch of [
  {operation:"TRANSFER"}, {outcome:"CREDIT"},
  {outcome:"ALLOWED",reason:"UNAVAILABLE"},
  {outcome:"DENIED",reason:"POLICY_OK"},
  {outcome:"ERROR",reason:"POLICY_DENIED"}
 ]){
  await assert.rejects(()=>gate.publish({
   operation:"ACCOUNT_SELECT",outcome:"ALLOWED",reason:"POLICY_OK",...patch
  }),/ACCOUNT_AUDIT_RECEIPT_DENIED/);
 }
 const bad=createAccountAuditReceiptGate({
  makeId:()=>"invalid",emit:async e=>validReceipt(e)
 });
 await assert.rejects(()=>bad.publish({
  operation:"ACCOUNT_SELECT",outcome:"ALLOWED",reason:"POLICY_OK"
 }),/ACCOUNT_AUDIT_RECEIPT_DENIED/);
 const outage=createAccountAuditReceiptGate({
  makeId:()=>ID,emit:async()=>{throw new Error("contains internal secret");}
 });
 await assert.rejects(()=>outage.publish({
  operation:"ACCOUNT_SELECT",outcome:"ALLOWED",reason:"POLICY_OK"
 }),error=>error.message==="ACCOUNT_AUDIT_UNAVAILABLE");
 assert.throws(()=>createAccountAuditReceiptGate({}),/ACCOUNT_AUDIT_RECEIPT_CONFIG_INVALID/);
});
