"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createAccountReadAuditGate} from "../security/account-read-audit-gate.mjs";
import {createAccountAuditEnvelope} from "../security/account-audit-envelope.mjs";
test("a successful read is released only after audit acknowledgement",async()=>{
 const sequence=[];
 const response=Object.freeze({accounts:[],financialExecutionEnabled:false});
 const audit=createAccountAuditEnvelope({sink:async()=>{sequence.push("audit");}});
 const gate=createAccountReadAuditGate({read:async()=>{
  sequence.push("query");return response;
 },audit});
 assert.equal(await gate.execute({}),response);
 assert.deepEqual(sequence,["query","audit"]);
});
test("database error and audit outage cannot disclose customer rows",async()=>{
 const audit=createAccountAuditEnvelope({sink:async()=>{throw Error("AUDIT_UNAVAILABLE");}});
 const gate=createAccountReadAuditGate({read:async()=>({
  accounts:[{accountId:"sensitive"}],financialExecutionEnabled:false
 }),audit});
 await assert.rejects(()=>gate.execute({}),/AUDIT_UNAVAILABLE/);
 const events=[];
 const failed=createAccountReadAuditGate({
  read:async()=>{throw Error("internal SQL customer details");},
  audit:createAccountAuditEnvelope({sink:async e=>events.push(e)})
 });
 await assert.rejects(()=>failed.execute({}),/ACCOUNT_READ_DENIED/);
 assert.equal(events[0].outcome,"ERROR");
 assert.equal(JSON.stringify(events).includes("customer details"),false);
});
