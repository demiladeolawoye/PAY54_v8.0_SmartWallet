"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createAccountAccessAudit} from "../security/account-access-audit.mjs";
test("audit output has no customer identifiers or session data",async()=>{
 const events=[];
 const audit=createAccountAccessAudit({emitAuditEvent:async event=>events.push(event),
   now:()=>new Date("2026-11-15T19:00:00Z")});
 const out=await audit.record({operation:"ACCOUNT_LIST",outcome:"DENIED",reason:"REVOKED",
   principalId:"private",sessionToken:"secret",accountId:"private"});
 assert.equal(events.length,1);
 assert.equal(out.occurredAt,"2026-11-15T19:00:00.000Z");
 assert.equal(JSON.stringify(out).includes("private"),false);
 assert.equal(JSON.stringify(out).includes("secret"),false);
 assert.equal(out.financialExecutionEnabled,false);
 assert.ok(Object.isFrozen(out));
});
test("malformed decision, unknown reason and missing sink fail closed",async()=>{
 assert.throws(()=>createAccountAccessAudit({}),TypeError);
 const audit=createAccountAccessAudit({emitAuditEvent:async()=>{}});
 for(const item of [
  {operation:"UNSAFE",outcome:"DENIED",reason:"REVOKED"},
  {operation:"ACCOUNT_SELECT",outcome:"ALLOWED",reason:"REVOKED"},
  {operation:"ACCOUNT_LIST",outcome:"DENIED",reason:"POLICY_OK"},
  {operation:"ACCOUNT_LIST",outcome:"ERROR",reason:"SECRET"}
 ])await assert.rejects(()=>audit.record(item),TypeError);
});
test("audit storage failure is surfaced instead of silently pretending to record",async()=>{
 const audit=createAccountAccessAudit({emitAuditEvent:async()=>{throw Error("SINK_UNAVAILABLE")}});
 await assert.rejects(()=>audit.record({
  operation:"WALLET_LIST",outcome:"ERROR",reason:"UNAVAILABLE"
 }),/SINK_UNAVAILABLE/);
});
