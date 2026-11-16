"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createAccountAuditReceiptGate} from "../security/account-audit-receipt-gate.mjs";
import {createAccountReceiptAuditedRead} from "../security/account-receipt-audited-read.mjs";

const A="11111111-1111-4111-8111-111111111111";
const B="22222222-2222-4222-8222-222222222222";
function makeAudit({persisted=true,fail=false}={}){
 let next=0;
 return createAccountAuditReceiptGate({
  makeId:()=>next++===0?A:B,
  emit:async event=>{
   if(fail)throw new Error("AUDIT_INFRASTRUCTURE_OFFLINE");
   return {
    eventId:event.eventId,accepted:true,persistenceConfirmed:persisted
   };
  }
 });
}
test("251: account disclosure response requires audit despite an eligible membership",async()=>{
 let disclosed=false;
 const gate=createAccountReceiptAuditedRead({
  read:async()=>({accountType:"BUSINESS",displayOnly:true,
   customerDataAccessEnabled:false,financialExecutionEnabled:false}),
  audit:makeAudit()
 });
 const result=await gate.execute({accountId:"synthetic"});
 disclosed=true;
 assert.equal(disclosed,true);
 assert.equal(result.accountType,"BUSINESS");
 assert.equal(result.financialExecutionEnabled,false);
});
test("251: audit unavailable or contradictory receipt cannot leak otherwise eligible data",async()=>{
 for(const audit of [makeAudit({persisted:false}),makeAudit({fail:true})]){
  let released=false;
  const gate=createAccountReceiptAuditedRead({
   read:async()=>({accountType:"PERSONAL",displayOnly:true,
    customerDataAccessEnabled:false,financialExecutionEnabled:false}),
   audit
  });
  await assert.rejects(()=>gate.execute({}).then(()=>{released=true;}),
   /ACCOUNT_READ_DENIED/);
  assert.equal(released,false);
 }
});
test("251: stale financial or customer-data flags force a generic denial",async()=>{
 for(const wrong of [
  {financialExecutionEnabled:true,customerDataAccessEnabled:false},
  {financialExecutionEnabled:false,customerDataAccessEnabled:true},
  {financialExecutionEnabled:undefined,customerDataAccessEnabled:false}
 ]){
  const gate=createAccountReceiptAuditedRead({
   read:async()=>wrong,audit:makeAudit()
  });
  await assert.rejects(()=>gate.execute({}),/ACCOUNT_READ_DENIED/);
 }
});
