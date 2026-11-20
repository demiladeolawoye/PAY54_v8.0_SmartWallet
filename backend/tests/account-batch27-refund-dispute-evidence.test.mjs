"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54RefundDisputeEvidence as inspect}
 from "../governance/pay54-batch27-refund-dispute-evidence.mjs";
const x={originalCaptureDigest:"a".repeat(64),currency:"GBP",
 originalMinor:"10000",refundMinor:"2500",chargebackMinor:"5000"};
test("1175: refund+dispute cannot exceed original capture",()=>{
 const r=inspect(x);assert.equal(r.totalClaimWithinCapture,true);
 assert.equal(r.customerCreditAuthorised,false);
 assert.equal(inspect({...x,chargebackMinor:"9000"})
  .totalClaimWithinCapture,false);
});
test("1175: negative refund and invalid currency rejected",()=>{
 for(const y of [{refundMinor:"-100"},{currency:"BTC"},
  {originalCaptureDigest:"invalid"}])
 assert.throws(()=>inspect({...x,...y}),
 /REFUND_DISPUTE_EVIDENCE_DENIED/);
});
