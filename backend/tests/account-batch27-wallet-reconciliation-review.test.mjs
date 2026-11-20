"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54WalletSettlementEvidence as inspect}
 from "../governance/pay54-batch27-wallet-reconciliation-review.mjs";
const base={currency:"GBP",providerReferenceHash:"a".repeat(64),
 legs:[{accountKey:"cust.001",deltaMinor:"10000"},
  {accountKey:"clearing.001",deltaMinor:"-10000"}]};
test("1159: balanced minor-unit ledger evidence does not post actual money",()=>{
 const r=inspect(base);
 assert.equal(r.balancingConservationHolds,true);
 assert.equal(r.realCustomerBalanceUpdated,false);
});
test("1159: unbalanced entries and duplicate legs denied or flagged",()=>{
 const r=inspect({...base,legs:[
  base.legs[0],{accountKey:"clearing.001",deltaMinor:"-9999"}]});
 assert.equal(r.balancingConservationHolds,false);
 assert.throws(()=>inspect({...base,legs:[
  base.legs[0],base.legs[0]]}),/LEDGER_SETTLEMENT_REVIEW_DENIED/);
 assert.throws(()=>inspect({...base,legs:[
  base.legs[0],{accountKey:"other",deltaMinor:"NaN"}]}),
  /LEDGER_SETTLEMENT_REVIEW_DENIED/);
});
