"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createAccountAuditReceiptGate} from "../security/account-audit-receipt-gate.mjs";
import {createAccountReceiptAuditedRead} from "../security/account-receipt-audited-read.mjs";

const EVENT_ID="11111111-1111-4111-8111-111111111111";
const readValue=Object.freeze({
 accounts:Object.freeze([]),customerDataAccessEnabled:false,
 financialExecutionEnabled:false
});
function deferred(){
 let resolve,reject;
 const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
 return {promise,resolve,reject};
}
test("234: result remains pending until audit receipt completes",async()=>{
 const receipt=deferred();
 const audit=createAccountAuditReceiptGate({
  makeId:()=>EVENT_ID,emit:async()=>receipt.promise
 });
 const gate=createAccountReceiptAuditedRead({
  read:async()=>readValue,audit
 });
 let settled=false;
 const operation=gate.execute({}).then(value=>{settled=true;return value;});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(settled,false);
 receipt.resolve({eventId:EVENT_ID,accepted:true,persistenceConfirmed:true});
 assert.equal(await operation,readValue);
 assert.equal(settled,true);
});
test("234: late failed audit receipt rejects instead of releasing private result",async()=>{
 const receipt=deferred();
 const gate=createAccountReceiptAuditedRead({
  read:async()=>readValue,
  audit:createAccountAuditReceiptGate({
   makeId:()=>EVENT_ID,emit:async()=>receipt.promise
  })
 });
 let released=false;
 const operation=gate.execute({}).then(()=>{released=true;});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(released,false);
 receipt.reject(new Error("audit write timed out secret content"));
 await assert.rejects(operation,/ACCOUNT_READ_DENIED/);
 assert.equal(released,false);
});
test("234: audit callback cannot mutate sealed result or emitted envelope",async()=>{
 let event;
 const gate=createAccountReceiptAuditedRead({
  read:async()=>readValue,
  audit:createAccountAuditReceiptGate({
   makeId:()=>EVENT_ID,
   emit:async value=>{
    event=value;
    return {eventId:value.eventId,accepted:true,persistenceConfirmed:true};
   }
  })
 });
 assert.equal(await gate.execute({}),readValue);
 assert.ok(Object.isFrozen(event));
 assert.equal(event.financialExecutionEnabled,false);
 assert.ok(!JSON.stringify(event).includes("accounts"));
 assert.ok(!JSON.stringify(event).includes("tenantId"));
});
