"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createAuditedAccountRead} from "../security/account-decision-audit.mjs";
import {createAccountAuditEnvelope} from "../security/account-audit-envelope.mjs";
test("audit acknowledgement precedes successful account disclosure",async()=>{
 const sequence=[],result=Object.freeze({accounts:[]});
 const service={read:async()=>{sequence.push("read");return result;}};
 const audit=createAccountAuditEnvelope({sink:async event=>{
  sequence.push("audit");assert.equal(event.outcome,"ALLOWED");
 }});
 const guarded=createAuditedAccountRead({service,audit});
 assert.equal(await guarded.read({}),result);
 assert.deepEqual(sequence,["read","audit"]);
});
test("denied tenancy is redacted and audited, not turned into rows",async()=>{
 const events=[];
 const guarded=createAuditedAccountRead({
  service:{read:async()=>{throw new Error("ACCOUNT_TENANT_READ_DENIED");}},
  audit:createAccountAuditEnvelope({sink:async e=>events.push(e)})
 });
 await assert.rejects(()=>guarded.read({}),/ACCOUNT_READ_DENIED/);
 assert.equal(events[0].outcome,"DENIED");
 assert.equal(events[0].reason,"POLICY_DENIED");
});
test("audit sink outage prevents positive account read exposure",async()=>{
 const guarded=createAuditedAccountRead({
  service:{read:async()=>({accounts:[{accountId:"private"}]})},
  audit:createAccountAuditEnvelope({sink:async()=>{throw new Error("AUDIT_OFFLINE");}})
 });
 await assert.rejects(()=>guarded.read({}),/AUDIT_OFFLINE/);
});
test("unknown database errors produce a generic denial and error audit",async()=>{
 const events=[];
 const guarded=createAuditedAccountRead({
  service:{read:async()=>{throw Error("private SQL schema details");}},
  audit:createAccountAuditEnvelope({sink:async e=>events.push(e)})
 });
 await assert.rejects(()=>guarded.read({}),/ACCOUNT_READ_DENIED/);
 assert.equal(events[0].outcome,"ERROR");
 assert.equal(JSON.stringify(events).includes("schema details"),false);
});
