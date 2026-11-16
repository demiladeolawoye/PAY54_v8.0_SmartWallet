"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {
 createAccountAuditReceiptGate,consumeAccountAuditReceipt
} from "../security/account-audit-receipt-gate.mjs";
import {createAccountReceiptAuditedRead} from "../security/account-receipt-audited-read.mjs";

const A="11111111-1111-4111-8111-111111111111";
const B="22222222-2222-4222-8222-222222222222";
const decision={operation:"ACCOUNT_SELECT",outcome:"ALLOWED",reason:"POLICY_OK"};
const permitted=Object.freeze({
 customerDataAccessEnabled:false,financialExecutionEnabled:false,
 accounts:Object.freeze([])
});
function writer(id=A){
 return createAccountAuditReceiptGate({
  makeId:()=>id,
  emit:async event=>({eventId:event.eventId,accepted:true,persistenceConfirmed:true})
 });
}
test("265: authentic receipt is frozen, correctly scoped and consumed once",async()=>{
 const receipt=await writer().publish(decision);
 assert.ok(Object.isFrozen(receipt));
 assert.equal(receipt.eventId,A);
 assert.equal(consumeAccountAuditReceipt(receipt,decision).acceptedForSourceDisclosure,true);
 assert.throws(()=>consumeAccountAuditReceipt(receipt,decision),
  /ACCOUNT_AUDIT_RECEIPT_UNTRUSTED/);
});
test("265: forged, copied, wrong-operation and wrong-reason receipts deny",async()=>{
 const receipt=await writer().publish(decision);
 for(const forged of [
  {...receipt},Object.freeze({...receipt}),
  {operation:"ACCOUNT_SELECT",outcome:"ALLOWED",reason:"POLICY_OK",
   receiptAccepted:true,sourceAckOnly:true,
   durableStorageIndependentlyVerified:false,financialExecutionEnabled:false},
  null
 ]){
  assert.throws(()=>consumeAccountAuditReceipt(forged,decision),
   /ACCOUNT_AUDIT_RECEIPT_UNTRUSTED/);
 }
 for(const changed of [
  {operation:"ACCOUNT_LIST"}, {outcome:"ERROR"}, {reason:"UNAVAILABLE"}
 ]){
  assert.throws(()=>consumeAccountAuditReceipt(receipt,{...decision,...changed}),
   /ACCOUNT_AUDIT_RECEIPT_UNTRUSTED/);
 }
 assert.equal(consumeAccountAuditReceipt(receipt,decision).acceptedForSourceDisclosure,true);
});
test("265: spoofed audit adapter cannot return an account result",async()=>{
 let invoked=0;
 const gate=createAccountReceiptAuditedRead({
  read:async()=>permitted,
  audit:{publish:async()=>{
   invoked++;
   return Object.freeze({eventId:A,...decision,receiptAccepted:true,
    sourceAckOnly:true,durableStorageIndependentlyVerified:false,
    financialExecutionEnabled:false});
  }}
 });
 await assert.rejects(()=>gate.execute({}),
  error=>error.message==="ACCOUNT_READ_DENIED");
 assert.equal(invoked,1);
});
test("265: genuine receipt from unrelated audit outcome cannot authorise disclosure",async()=>{
 const denyWriter=writer(B);
 const deniedReceipt=await denyWriter.publish({
  operation:"ACCOUNT_SELECT",outcome:"DENIED",reason:"POLICY_DENIED"
 });
 const gate=createAccountReceiptAuditedRead({
  read:async()=>permitted,
  audit:{publish:async()=>deniedReceipt}
 });
 await assert.rejects(()=>gate.execute({}),/ACCOUNT_READ_DENIED/);
});
test("265: genuine allowed receipt cannot be replayed across two read operations",async()=>{
 const sameReceipt=await writer().publish(decision);
 const gate=createAccountReceiptAuditedRead({
  read:async()=>permitted,
  audit:{publish:async()=>sameReceipt}
 });
 assert.equal(await gate.execute({}),permitted);
 await assert.rejects(()=>gate.execute({}),/ACCOUNT_READ_DENIED/);
});
test("265: unique genuine receipts preserve permitted test-only reads",async()=>{
 let index=0;
 const gate=createAccountReceiptAuditedRead({
  read:async()=>permitted,
  audit:createAccountAuditReceiptGate({
   makeId:()=>index++===0?A:B,
   emit:async event=>({eventId:event.eventId,accepted:true,persistenceConfirmed:true})
  })
 });
 assert.equal(await gate.execute({}),permitted);
 assert.equal(await gate.execute({}),permitted);
});
