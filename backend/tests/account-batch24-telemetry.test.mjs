"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { redactPay54IdentitySecurityEvent as redact }
 from "../security/identity-telemetry.mjs";
const valid={
 eventType:"IDENTITY_ASSERTION_DENIED",reasonCode:"INVALID_SIGNATURE",
 correlationId:"77777777-7777-4777-8777-777777777777",
 occurredAtMs:1800000000000
};
test("945: security event contains no account, bearer, CSRF or financial data",()=>{
 const record=redact(valid);
 assert.equal(record.customerIdentifierIncluded,false);
 assert.equal(record.credentialIncluded,false);
 assert.equal(record.financialInstructionIncluded,false);
 assert.ok(Object.isFrozen(record));
});
test("945: unexpected sensitive fields and false success are refused",()=>{
 for(const extra of [
  {bearerToken:"secret"},{csrfToken:"private"},
  {accessAssertion:"signed-token"},{principalId:valid.correlationId},
  {walletBalance:999},{reasonCode:"SUCCESS"},
  {eventType:"BOOTSTRAP_ISSUED"},{occurredAtMs:NaN}
 ])assert.throws(()=>redact({...valid,...extra}),
  /IDENTITY_TELEMETRY_DENIED/);
});
test("945: only correctly named bootstrap success is permitted",()=>{
 const record=redact({...valid,
  eventType:"BOOTSTRAP_ISSUED",reasonCode:"SUCCESS"});
 assert.equal(record.reasonCode,"SUCCESS");
});
