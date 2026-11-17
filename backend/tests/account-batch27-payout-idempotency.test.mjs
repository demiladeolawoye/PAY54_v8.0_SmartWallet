"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54PayoutIdempotency as inspect}
 from "../governance/pay54-batch27-payout-idempotency.mjs";
const base={instructionDigest:"a".repeat(64),
 primaryProviderReference:"b".repeat(64),
 secondaryProviderReference:"c".repeat(64),
 primaryStatus:"FAILED",secondaryStatus:"NOT_SUBMITTED",
 sameIdempotencyKeyReused:false};
test("1173: failed primary payout does not automatically authorise fallback",()=>{
 const r=inspect(base);
 assert.equal(r.retryOrCompensatingPaymentAuthorised,false);
 assert.equal(r.ledgerPostingAuthorised,false);
});
test("1173: unknown primary and two settled references are hazardous",()=>{
 assert.equal(inspect({...base,primaryStatus:"UNKNOWN",
  secondaryStatus:"PENDING"}).failoverWhilePrimaryUncertainProhibited,true);
 assert.equal(inspect({...base,primaryStatus:"SETTLED",
  secondaryStatus:"SETTLED"}).duplicateSettlementIndicated,true);
});
