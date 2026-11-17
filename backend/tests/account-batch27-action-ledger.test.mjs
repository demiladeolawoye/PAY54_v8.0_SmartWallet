"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessPay54Batch27ActionSourceSet as assess,
 inspectPay54Batch27TrackedActionLedger as inspect}
 from "../governance/pay54-batch27-action-ledger.mjs";
test("1146: actual repository has 80 unique tracked actions through checkpoint B",()=>{
 const r=inspect({throughId:1147});
 assert.equal(r.expectedActionCount,80);
 assert.equal(r.rangeFullyCovered,true);
 assert.deepEqual(r.missingActionIds,[]);
 assert.equal(r.productionReleaseAuthorised,false);
});
test("1146: duplicate engineering IDs cannot inflate action count",()=>{
 assert.throws(()=>assess({throughId:1069,sources:{
  "backend/governance/pay54-batch27-one.mjs":
   "/** PAY54 Batch 27 / 1068 */ const a=1;",
  "backend/tests/account-batch27-two.test.mjs":
   'test("1068: duplicate",()=>{});'
 }}),/BATCH27_ACTION_LEDGER_DENIED/);
});
test("1146: an action plan without tracked implementation remains incomplete",()=>{
 const result=assess({throughId:1069,sources:{
  "backend/governance/pay54-batch27-one.mjs":
   "/** PAY54 Batch 27 / 1068 */ const a=1;"
 }});
 assert.deepEqual(result.missingActionIds,[1069]);
 assert.equal(result.rangeFullyCovered,false);
});
