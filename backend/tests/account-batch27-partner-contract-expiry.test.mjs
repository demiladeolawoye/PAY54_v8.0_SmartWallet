"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54PartnerContractWindow as inspect}
 from "../governance/pay54-batch27-partner-contract-expiry.mjs";
const x={providerRole:"ng-primary-payout",
 effectiveFromMs:1800000000000,effectiveUntilMs:1800000100000,
 observedAtMs:1800000005000};
test("1119: in-date contract metadata does not prove regulatory permission",()=>{
 const r=inspect(x);
 assert.equal(r.currentContractDateWindowValid,true);
 assert.equal(r.documentSignaturesIndependentlyVerified,false);
 assert.equal(r.moneyMovementAuthorised,false);
});
test("1119: expired, future-start and inverted contract time windows denied/flagged",()=>{
 assert.equal(inspect({...x,observedAtMs:1800000100000})
  .currentContractDateWindowValid,false);
 assert.equal(inspect({...x,observedAtMs:1799999999999})
  .currentContractDateWindowValid,false);
 assert.throws(()=>inspect({...x,effectiveUntilMs:1700000000000}),
  /REGULATED_CONTRACT_WINDOW_DENIED/);
});
