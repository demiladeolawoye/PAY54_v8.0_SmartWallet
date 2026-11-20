"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54SessionAuditEvidence as inspect}
 from "../governance/pay54-batch27-security-event-audit.mjs";
const e={eventDigest:"a".repeat(64),recordedAtMs:1800000000000,
 eventType:"SESSION_REVOKED",appendOnlyStoreClaimed:true};
test("1157: hashed audit event is not independently verified revocation proof",()=>{
 const r=inspect(e);
 assert.equal(r.actualDatabaseAuditWriterVerified,false);
 assert.equal(r.customerIdentityIncluded,false);
});
test("1157: sensitive fields cannot be treated as permitted audit events",()=>{
 assert.throws(()=>inspect({...e,eventType:"BEARER_TOKEN_DUMP"}),
 /SECURITY_EVENT_AUDIT_DENIED/);
 assert.throws(()=>inspect({...e,eventDigest:"secret"}),
 /SECURITY_EVENT_AUDIT_DENIED/);
});
