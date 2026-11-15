"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createAccountViewCache} from "../../assets/js/dashboard/account-view-cache.mjs";
const A="22222222-2222-4222-8222-222222222222";
const B="33333333-3333-4333-8333-333333333333";
const items=[{accountId:A,type:"PERSONAL",displayName:"Personal"},
 {accountId:B,type:"BUSINESS",displayName:"Example business"}];
test("account switch clears labels and never changes effective financial context",()=>{
 const cache=createAccountViewCache();
 cache.setDisplayOptions(items);
 assert.equal(cache.snapshot().accounts.length,2);
 const intent=cache.requestSwitch(B);
 assert.equal(intent.requestedAccountId,B);
 assert.equal(intent.effectiveAccountChanged,false);
 assert.equal(intent.financialExecutionEnabled,false);
 assert.deepEqual(cache.snapshot().accounts,[]);
 assert.equal(cache.snapshot().selectedAccountId,null);
});
test("logout, identity change and failed verification invalidate account picker cache",()=>{
 const cache=createAccountViewCache();
 for(const action of ["onLogout","onPrincipalChange","onVerificationFailed"]){
  cache.setDisplayOptions(items);cache[action]();
  assert.equal(cache.snapshot().accounts.length,0);
 }
});
test("balance, credentials, duplicate IDs and untrusted shapes are rejected",()=>{
 const cache=createAccountViewCache();
 for(const list of [
  [{...items[0],balance:100}],
  [{...items[0],token:"secret"}],
  [items[0],items[0]],
  [{...items[0],accountId:"bad"}]
 ])assert.throws(()=>cache.setDisplayOptions(list),/ACCOUNT_OPTIONS_INVALID/);
 assert.throws(()=>cache.requestSwitch(B),/ACCOUNT_SWITCH_UNAVAILABLE/);
});
