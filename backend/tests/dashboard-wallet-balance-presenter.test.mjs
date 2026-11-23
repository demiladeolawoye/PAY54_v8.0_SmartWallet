"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createPay54WalletBalancePresenter as create}
 from "../../assets/js/dashboard/wallet-balance-presenter.mjs";
const A="22222222-2222-4222-8222-222222222222";
const B="33333333-3333-4333-8333-333333333333";
const W="44444444-4444-4444-8444-444444444444";
const delay=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const payload=()=>({schema:"pay54.account-wallet-balance-read.v1",
 accountId:A,walletId:W,sessionVersion:3,currency:"GBP",
 availableMinor:"0",asOfRevision:5,displayOnly:true,
 backendAuthenticationRequired:true,
 dataSourceProvenanceVerifiedByThisModule:false,
 financialExecutionAuthorised:false,productionReady:false});
function fixture({reader=async()=>payload()}={}){
 const display=[],cleared=[];
 const presenter=create({authenticatedRead:reader,
  renderBalance:x=>display.push(x),clearBalance:()=>cleared.push(true)});
 return {presenter,display,cleared};
}
test("verified read preserves exact integer minor units without float conversion",async()=>{
 const x=fixture();
 x.presenter.confirmFromTrustedAccountSelection({accountId:A,principalVersion:3});
 const r=await x.presenter.refresh({accountId:A,principalVersion:3});
 assert.equal(r.status,"RENDERED");
 assert.equal(x.display.length,1);
 assert.equal(x.display[0].availableMinor,"0");
 assert.equal(x.display[0].financialExecutionAuthorised,false);
 assert.ok(Object.isFrozen(x.display[0]));
});
test("no stale A response can overwrite B after a switch",async()=>{
 const d=delay(),rendered=[];
 const x=fixture({reader:async ({accountId})=>
   accountId===A?await d.promise:{...payload(),accountId:B,sessionVersion:4}});
 x.presenter.confirmFromTrustedAccountSelection({accountId:A,principalVersion:3});
 const first=x.presenter.refresh({accountId:A,principalVersion:3});
 x.presenter.onAccountSwitchRequested();
 x.presenter.confirmFromTrustedAccountSelection({accountId:B,principalVersion:4});
 assert.equal((await x.presenter.refresh({accountId:B,principalVersion:4})).status,"RENDERED");
 d.resolve(payload());
 assert.equal((await first).status,"STALE");
 assert.equal(x.display.length,1);
 assert.equal(x.display[0].accountId,B);
});
test("logout clears customer data and denies subsequent reads",async()=>{
 const x=fixture();
 x.presenter.confirmFromTrustedAccountSelection({accountId:A,principalVersion:3});
 await x.presenter.refresh({accountId:A,principalVersion:3});
 x.presenter.onLogout();
 assert.ok(x.cleared.length>=2);
 await assert.rejects(x.presenter.refresh({accountId:A,principalVersion:3}),
  /PAY54_WALLET_PRESENTATION_DENIED/);
});
test("malformed or other-tenant balances are denied and previous view cleared",async()=>{
 for(const override of [
  {accountId:B},{walletId:"bad"},{sessionVersion:4},
  {currency:"<img>"},{availableMinor:"100.00"},{availableMinor:"-1"},
  {asOfRevision:0},{displayOnly:false},{productionReady:true},
  {financialExecutionAuthorised:true},{injectedField:"sensitive"}
 ]){
  const x=fixture({reader:async()=>({...payload(),...override})});
  x.presenter.confirmFromTrustedAccountSelection({accountId:A,principalVersion:3});
  await assert.rejects(x.presenter.refresh({accountId:A,principalVersion:3}),
    /PAY54_WALLET_PRESENTATION_DENIED/);
  assert.equal(x.display.length,0);
  assert.ok(x.cleared.length>=2);
 }
});
test("authenticated transport errors are sanitised and clear stale display",async()=>{
 const x=fixture({reader:async()=>{throw Error("secret-token");}});
 x.presenter.confirmFromTrustedAccountSelection({accountId:A,principalVersion:3});
 await assert.rejects(x.presenter.refresh({accountId:A,principalVersion:3}),
  e=>e.message==="PAY54_WALLET_PRESENTATION_DENIED");
 assert.equal(x.display.length,0);
});
test("transport receives read-only abort signal and cannot perform wallet mutations here",async()=>{
 let observed;
 const x=fixture({reader:async input=>{observed=input;return payload();}});
 x.presenter.confirmFromTrustedAccountSelection({accountId:A,principalVersion:3});
 await x.presenter.refresh({accountId:A,principalVersion:3});
 assert.equal(observed.readOnly,true);
 assert.equal(typeof observed.signal?.aborted,"boolean");
 assert.equal(Object.keys(observed).length,4);
});
test("invalid verified account confirmation cannot keep an earlier account",async()=>{
 const x=fixture();
 x.presenter.confirmFromTrustedAccountSelection({accountId:A,principalVersion:3});
 assert.throws(()=>x.presenter.confirmFromTrustedAccountSelection({
  accountId:"invalid",principalVersion:3}),/PAY54_WALLET_PRESENTATION_DENIED/);
 await assert.rejects(x.presenter.refresh({accountId:A,principalVersion:3}),
  /PAY54_WALLET_PRESENTATION_DENIED/);
});
