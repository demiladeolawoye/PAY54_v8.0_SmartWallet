"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54NigeriaFailoverContract as inspect}
 from "../governance/pay54-batch26-rail-failover-review.mjs";
const base={primaryProviderId:"nigeria.primary",
 secondaryProviderId:"nigeria.secondary",
 allowNonIdempotentRetry:false,settlementReconciliationRequired:true,
 crossRailReferenceMappingDocumented:true};
test("1046: distinct payout adapters still do not prove live redundancy",()=>{
 const r=inspect(base);assert.equal(r.actualProviderRedundancyTested,false);
 assert.equal(r.paymentExecutionAuthorised,false);
});
test("1046: same provider and non-idempotent replay denied",()=>{
 for(const bad of [{secondaryProviderId:base.primaryProviderId},
  {allowNonIdempotentRetry:true},
  {settlementReconciliationRequired:false},
  {crossRailReferenceMappingDocumented:false}])
 assert.throws(()=>inspect({...base,...bad}),
 /NG_PAYOUT_FAILOVER_REVIEW_DENIED/);
});
