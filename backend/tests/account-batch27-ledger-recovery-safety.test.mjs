"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54SafeWebsiteRollback as inspect}
 from "../governance/pay54-batch27-ledger-recovery-safety.mjs";
const r={currentWebsiteSha:"a".repeat(40),
 restoredWebsiteSha:"b".repeat(40),
 ledgerSchemaChanged:false,ledgerEntriesReversed:false,
 paymentSettlementReplayRequested:false};
test("1181: website rollback source must not alter accounting ledger",()=>{
 const x=inspect(r);
 assert.equal(x.rollbackSeparatesFrontendFromMoneyEngine,true);
 assert.equal(x.webpageRollbackAuthorised,false);
});
test("1181: rollback including ledger replay, reversal or migration must not pass",()=>{
 for(const x of [{ledgerSchemaChanged:true},
  {ledgerEntriesReversed:true},
  {paymentSettlementReplayRequested:true}]){
  const result=inspect({...r,...x});
  assert.equal(result.unsafeFinancialSideEffectsDeclared,true);
  assert.equal(result.financialLedgerMutationAuthorised,false);
 }
});
