"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createPay54AuthenticatedAccountingBridge as make}
 from "../src/authenticated-accounting-bridge.mjs";

const A="22222222-2222-4222-8222-222222222222";
const B="33333333-3333-4333-8333-333333333333";
const P="11111111-1111-4111-8111-111111111111";
const W="44444444-4444-4444-8444-444444444444";
const S="55555555-5555-4555-8555-555555555555";
const token=Buffer.alloc(32,1).toString("base64url");
const req={headers:{authorization:"Bearer "+token}};
const session=()=>({sessionId:S,principalId:P,activeAccountId:A,
  version:2,status:"ACTIVE"});
const scope=()=>({accountId:A,principalId:P,walletId:W,currency:"GBP",
  active:true,verifiedPersonalOwner:true,activeWalletBinding:true,rlsVerified:true});
const accounting=()=>({schema:"pay54.wallet-restricted-accounting-proof.v1",
  accountId:A,walletId:W,currency:"GBP",postedMinor:"1000",
  heldMinor:"250",computedUnreservedMinor:"750",
  authorisedForCustomerDisplay:false,financialExecutionEnabled:false,
  productionReady:false,providerSettlementVerified:false});
function fixture({nextSession,initialSession,scopeAfter,scopeBefore,read}={}){
 let calls=0,scopes=0,reads=0;
 const bridge=make({
  resolveAuthenticatedSession:async ()=>{
   calls++;return calls===1?(initialSession??session()):(nextSession??session());
  },
  resolveWalletScope:async ()=>{
   scopes++;return scopes===1?(scopeBefore??scope()):(scopeAfter??scope());
  },
  restrictedReader:{read:async input=>{
   reads++;return read?read(input):accounting();
  }}
 });
 return {bridge,get calls(){return calls;},get scopes(){return scopes;},
  get reads(){return reads;}};
}
test("restricted accounting proof revalidates session and owner after read",async()=>{
 const x=fixture();
 const r=await x.bridge.read({request:req,requestedAccountId:A});
 assert.equal(r.computedUnreservedMinor,"750");
 assert.equal(r.sessionRechecked,true);
 assert.equal(r.authorisedForCustomerDisplay,false);
 assert.equal(r.customerAvailableBalanceVerified,false);
 assert.equal(r.stagingDeploymentAuthorised,false);
 assert.equal(x.calls,2);assert.equal(x.scopes,2);assert.equal(x.reads,1);
 assert.equal(Object.isFrozen(r),true);
 assert.equal(JSON.stringify(r).includes(token),false);
});
for(const [name,options] of [
 ["logout",{nextSession:{...session(),status:"REVOKED"}}],
 ["session version rotation",{nextSession:{...session(),version:3}}],
 ["switch to another account",{nextSession:{...session(),activeAccountId:B}}],
 ["other principal",{nextSession:{...session(),principalId:B}}],
 ["wallet binding changed",{scopeAfter:{...scope(),walletId:B}}],
 ["membership revoked",{scopeAfter:{...scope(),active:false}}],
 ["RLS proof revoked",{scopeAfter:{...scope(),rlsVerified:false}}],
 ["owner unverified",{scopeBefore:{...scope(),verifiedPersonalOwner:false}}],
 ["wrong ledger account",{read:async()=>({...accounting(),accountId:B})}],
 ["live balance claimed",{read:async()=>({...accounting(),authorisedForCustomerDisplay:true})}],
 ["server failure",{read:async()=>{throw Error("PRIVATE_SESSION_TOKEN");}}]
]){
 test("rejects "+name+" with no accounting disclosure",async()=>{
  const x=fixture(options);
  await assert.rejects(x.bridge.read({request:req,requestedAccountId:A}),
   err=>err.message==="PAY54_AUTHENTICATED_ACCOUNTING_UNAVAILABLE");
 });
}
test("refuses browser-account switch before any financial read",async()=>{
 const x=fixture();
 await assert.rejects(x.bridge.read({request:req,requestedAccountId:B}),
  /PAY54_AUTHENTICATED_ACCOUNTING_UNAVAILABLE/);
 assert.equal(x.reads,0);
});
test("rejects untrusted bearer encoding and missing auth components",async()=>{
 const x=fixture();
 await assert.rejects(x.bridge.read({
   request:{headers:{authorization:"Bearer fake"}},requestedAccountId:A}),
  /PAY54_AUTHENTICATED_ACCOUNTING_UNAVAILABLE/);
 assert.equal(x.calls,0);
 assert.throws(()=>make({}),/PAY54_AUTHENTICATED_ACCOUNTING_UNAVAILABLE/);
});
