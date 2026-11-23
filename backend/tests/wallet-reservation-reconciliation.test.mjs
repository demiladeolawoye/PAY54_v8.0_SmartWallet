"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {reconcilePay54WalletBalanceSnapshot as reconcile} from
 "../domain/wallet-reservation-reconciliation.mjs";
const accountId="11111111-1111-4111-8111-111111111111";
const walletId="22222222-2222-4222-8222-222222222222";
const fixture=()=>({accountId,walletId,currency:"GBP",
 postedMinor:"100000",heldMinor:"25000",postedEntryCount:2,
 heldReservationCount:1,asOfRevision:5,readOnlyTransaction:true,
 actorBoundRls:true,singleSnapshot:true});
test("reconciles canonical posted minus all HELD reservations in minor units",()=>{
 const r=reconcile(fixture());
 assert.equal(r.computedUnreservedMinor,"75000");
 assert.equal(r.customerAvailableBalanceVerified,false);
 assert.equal(r.approvedForCustomerDisplay,false);
 assert.equal(r.financialExecutionAuthorised,false);
 assert.ok(Object.isFrozen(r));
});
test("legitimate zero remains zero",()=>{
 const result=reconcile({...fixture(),postedMinor:"0",heldMinor:"0",
  postedEntryCount:0,heldReservationCount:0});
 assert.equal(result.computedUnreservedMinor,"0");
});
test("large precise minor units cannot lose integer precision",()=>{
 const result=reconcile({...fixture(),
  postedMinor:"123456789012345678901234567890",
  heldMinor:"123456789012345678901234567889"});
 assert.equal(result.computedUnreservedMinor,"1");
});
for(const [name,patch] of [
 ["overdrawn reservation",{postedMinor:"10",heldMinor:"11"}],
 ["negative",{postedMinor:"-1"}],
 ["decimal",{heldMinor:"1.1"}],
 ["scientific notation",{postedMinor:"1e20"}],
 ["leading zeros",{postedMinor:"001"}],
 ["unsafe precision as number",{postedMinor:100000}],
 ["untrusted currency",{currency:"GBP<script>"}],
 ["false transaction provenance",{readOnlyTransaction:false}],
 ["false RLS provenance",{actorBoundRls:false}],
 ["non-atomic snapshots",{singleSnapshot:false}],
 ["zero reservation without count",{heldMinor:"1",heldReservationCount:0}],
 ["held count without hold",{heldMinor:"0",heldReservationCount:1}],
 ["posted amount without entries",{postedMinor:"1",postedEntryCount:0}],
 ["revision invalid",{asOfRevision:0}],
 ["extra field injection",{productionReady:true}],
 ["wrong wallet",{walletId:"wrong"}]
]){
 test("rejects "+name,()=>assert.throws(
  ()=>reconcile({...fixture(),...patch}),
  /PAY54_WALLET_RECONCILIATION_DENIED/));
}
test("rejects wrong input shape",()=>{
 for(const v of [null,undefined,[],1,"secret",{}])
  assert.throws(()=>reconcile(v),/PAY54_WALLET_RECONCILIATION_DENIED/);
});
