"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {PAY54_ACCOUNT_CONTEXT_CACHE_DOMAINS,planPay54AccountScopedReload}
 from "../domain/account-context-cache-plan.mjs";

const oldId="22222222-2222-4222-8222-222222222222";
const nextId="33333333-3333-4333-8333-333333333333";
const plan={
 schema:"pay54.account-rebind-preflight.v1",candidateAccountId:nextId,
 sessionRebound:false,replayFenceValidated:false
};
test("760: all payment and financial views require fresh tenant-scoped reads after rebind",()=>{
 const result=planPay54AccountScopedReload({
  rebindPreflight:plan,oldAccountId:oldId,newAccountId:nextId
 });
 for(const scope of ["wallets","balances","transactions","cards",
  "payment-sources","recipients","activity","permissions",
  "dashboard-feed","saved-beneficiaries"]){
  assert.ok(result.domainsToClear.includes(scope),scope);
 }
 assert.equal(result.requiresInFlightRequestCancellation,true);
 assert.equal(result.requiresFreshServerVerifiedSession,true);
 assert.equal(result.requiresTenantScopedReadQueries,true);
 assert.equal(result.crossTenantDataDisplayed,false);
 assert.equal(result.dataCacheCleared,false);
 assert.equal(result.transitionExecuted,false);
 assert.equal(result.financialExecutionAuthorised,false);
 assert.ok(Object.isFrozen(PAY54_ACCOUNT_CONTEXT_CACHE_DOMAINS));
});
test("760: same account and untrusted or already-completed rebind claims fail closed",()=>{
 for(const input of [
  {rebindPreflight:plan,oldAccountId:nextId,newAccountId:nextId},
  {rebindPreflight:{...plan,sessionRebound:true},oldAccountId:oldId,newAccountId:nextId},
  {rebindPreflight:{...plan,candidateAccountId:oldId},oldAccountId:oldId,newAccountId:nextId},
  {rebindPreflight:plan,oldAccountId:"not-uuid",newAccountId:nextId}
 ])assert.throws(()=>planPay54AccountScopedReload(input),/BOUNDARY_DENIED/);
});
