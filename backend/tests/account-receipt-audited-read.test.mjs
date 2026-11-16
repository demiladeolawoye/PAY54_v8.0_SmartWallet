"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createAccountAuditReceiptGate} from "../security/account-audit-receipt-gate.mjs";
import {createAccountReceiptAuditedRead} from "../security/account-receipt-audited-read.mjs";

const EVENT_ID="11111111-1111-4111-8111-111111111111";
const RESULT=Object.freeze({
 label:"Account",customerDataAccessEnabled:false,
 financialExecutionEnabled:false
});
function audit(emit){
 return createAccountAuditReceiptGate({makeId:()=>EVENT_ID,emit});
}
test("233: no result disclosed before positive audit receipt",async()=>{
 const sequence=[];
 const gated=createAccountReceiptAuditedRead({
  read:async()=>{sequence.push("read");return RESULT;},
  audit:audit(async e=>{
   sequence.push("audit");
   return {eventId:e.eventId,accepted:true,persistenceConfirmed:true};
  })
 });
 assert.equal(await gated.execute({}),RESULT);
 assert.deepEqual(sequence,["read","audit"]);
});
test("233: audit refusal, empty ack, outage and forged ack never disclose",async()=>{
 for (const sink of [
  async()=>undefined,
  async e=>({eventId:e.eventId,accepted:false,persistenceConfirmed:true}),
  async()=>{throw new Error("sql password and customer secret");}
 ]){
  const gated=createAccountReceiptAuditedRead({
   read:async()=>RESULT,audit:audit(sink)
  });
  await assert.rejects(()=>gated.execute({}),
   error=>error.message==="ACCOUNT_READ_DENIED");
 }
});
test("233: invalid result cannot disclose and produces only error-class audit event",async()=>{
 for(const value of [
  null,undefined,{}, {customerDataAccessEnabled:true,financialExecutionEnabled:false},
  {customerDataAccessEnabled:false,financialExecutionEnabled:true}
 ]){
  const events=[];
  const gate=createAccountReceiptAuditedRead({
   read:async()=>value,
   audit:audit(async e=>{
    events.push(e);
    return {eventId:e.eventId,accepted:true,persistenceConfirmed:true};
   })
  });
  await assert.rejects(()=>gate.execute({}),/ACCOUNT_READ_DENIED/);
  assert.equal(events.length,1);
  assert.equal(events[0].outcome,"ERROR");
  assert.equal(events[0].reason,"UNAVAILABLE");
 }
});
test("233: read exception and audit outage cannot expose internal errors",async()=>{
 const gate=createAccountReceiptAuditedRead({
  read:async()=>{throw new Error("postgres internal tenant data");},
  audit:audit(async()=>{throw new Error("sink offline with key");})
 });
 await assert.rejects(()=>gate.execute({}),
  error=>error.message==="ACCOUNT_READ_DENIED");
 assert.throws(()=>createAccountReceiptAuditedRead({}),
  /ACCOUNT_RECEIPT_READ_CONFIG_INVALID/);
});
