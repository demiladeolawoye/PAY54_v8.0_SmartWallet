"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {
 calculatePay54BalanceMovement,unavailablePay54BalanceMovement
} from "../domain/balance-movement-projection.mjs";
const accountId="123e4567-e89b-42d3-a456-426614174000";
const other="123e4567-e89b-42d3-a456-426614174001";
const close=1800000000000;
function snapshots(opening="100000",closing="125000",days=30){
 return {
  opening:{accountId,currency:"NGN",asOf:close-days*86400000,minorUnits:opening},
  closing:{accountId,currency:"NGN",asOf:close,minorUnits:closing},
  periodDays:days,referenceAsOf:close
 };
}
test("320: exact minor-unit movement and percent for all supported periods",()=>{
 for(const period of [7,30,90]){
  const r=calculatePay54BalanceMovement(snapshots("100000","125000",period));
  assert.equal(r.changeMinorUnits,"25000");
  assert.equal(r.percentBasisPoints,"2500");
  assert.equal(r.direction,"INCREASE");
  assert.equal(r.periodDays,period);
  assert.equal(r.sourceSnapshotProvenanceVerified,false);
  assert.equal(r.independentlyAttested,false);
  assert.equal(r.financialExecutionEnabled,false);
 }
});
test("320: negative and huge integer amounts never use floating-point balances",()=>{
 const r=calculatePay54BalanceMovement(snapshots(
  "100000000000000000000000","99999999999999999999999"));
 assert.equal(r.changeMinorUnits,"-1");
 assert.equal(r.direction,"DECREASE");
 assert.equal(typeof r.percentBasisPoints,"string");
});
test("320: zero opening returns no invented percentage",()=>{
 const r=calculatePay54BalanceMovement(snapshots("0","100"));
 assert.equal(r.changeMinorUnits,"100");
 assert.equal(r.zeroOpeningBalance,true);
 assert.equal(r.percentBasisPoints,null);
});
test("320: foreign account/currency, incorrect window and future snapshot mismatch denied",()=>{
 const s=snapshots();
 for(const v of [
  {...s,closing:{...s.closing,accountId:other}},
  {...s,closing:{...s.closing,currency:"GBP"}},
  {...s,opening:{...s.opening,asOf:s.opening.asOf+1}},
  {...s,referenceAsOf:close-1},
  {...s,periodDays:14}
 ]){
  assert.throws(()=>calculatePay54BalanceMovement(v),
   /PAY54_BALANCE_(?:SNAPSHOT_SCOPE_MISMATCH|PERIOD_INVALID)/);
 }
});
test("320: malformed currency, precision and timestamps refused",()=>{
 for(const invalid of [
  {...snapshots(),opening:{...snapshots().opening,minorUnits:"1.25"}},
  {...snapshots(),opening:{...snapshots().opening,minorUnits:"01"}},
  {...snapshots(),closing:{...snapshots().closing,currency:"USDT"}},
  {...snapshots(),closing:{...snapshots().closing,asOf:NaN}}
 ]){
  assert.throws(()=>calculatePay54BalanceMovement(invalid),
   /PAY54_BALANCE_SNAPSHOT_INVALID/);
 }
});
test("320: missing true ledger evidence returns a neutral available-only label",()=>{
 const result=unavailablePay54BalanceMovement(30);
 assert.equal(result.status,"UNAVAILABLE");
 assert.equal(result.movementAmount,null);
 assert.equal(result.percentage,null);
 assert.equal(result.financialExecutionEnabled,false);
 assert.ok(Object.isFrozen(result));
});
