"use strict";
import test from "node:test";import assert from "node:assert/strict";
import {createAccountAuditEnvelope} from "../security/account-audit-envelope.mjs";
const ID="11111111-1111-4111-8111-111111111111";
test("audit envelope strictly minimises personally identifying data",async()=>{
 const emitted=[];
 const audit=createAccountAuditEnvelope({sink:async e=>emitted.push(e),
  makeId:()=>ID,now:()=>new Date("2026-11-15T12:00:00Z")});
 const v=await audit.publish({operation:"ACCOUNT_LIST",outcome:"DENIED",reason:"NO_SESSION",
  accountId:"sensitive",token:"secret"});
 assert.deepEqual(Object.keys(v),["schema","eventId","operation","outcome","reason","occurredAt","financialExecutionEnabled"]);
 assert.equal(JSON.stringify(v).includes("secret"),false);
 assert.equal(v.financialExecutionEnabled,false);
 assert.equal(emitted.length,1);
});
test("audit failure is surfaced and inconsistent decisions rejected",async()=>{
 const gate=createAccountAuditEnvelope({sink:async()=>{throw Error("AUDIT_OFFLINE");}});
 await assert.rejects(()=>gate.publish({operation:"ACCOUNT_LIST",outcome:"ERROR",reason:"UNAVAILABLE"}),/AUDIT_OFFLINE/);
 await assert.rejects(()=>gate.publish({operation:"ACCOUNT_LIST",outcome:"ALLOWED",reason:"REVOKED"}),/AUDIT_DECISION_INVALID/);
});
