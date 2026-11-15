"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createAccountAuditCorrelation} from "../security/account-audit-correlation.mjs";
const R="11111111-1111-4111-8111-111111111111";
test("correlations are structurally safe and redact supplied identifiers",()=>{
 const tool=createAccountAuditCorrelation({generateId:()=>R});
 const event=tool.create({operation:"ACCOUNT_LIST",outcome:"DENIED",token:"secret",subjectId:"sensitive"});
 assert.deepEqual(Object.keys(event),["requestId","operation","outcome","containsIdentity","financialExecutionEnabled"]);
 assert.equal(JSON.stringify(event).includes("secret"),false);
 assert.equal(event.containsIdentity,false);
});
test("untrusted IDs and operations are rejected",()=>{
 assert.throws(()=>createAccountAuditCorrelation({generateId:()=>""}).create({operation:"ACCOUNT_LIST",outcome:"DENIED"}),/AUDIT_CORRELATION_DENIED/);
 assert.throws(()=>createAccountAuditCorrelation().create({operation:"PAY",outcome:"ALLOWED"}),/AUDIT_CORRELATION_DENIED/);
});
