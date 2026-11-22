"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createPay54AuthenticatedWalletBalanceRead as create}
 from "../src/authenticated-wallet-balance-read.mjs";

const principal="11111111-1111-4111-8111-111111111111";
const account="22222222-2222-4222-8222-222222222222";
const other="33333333-3333-4333-8333-333333333333";
const wallet="44444444-4444-4444-8444-444444444444";
const journal="55555555-5555-4555-8555-555555555555";
const sessionId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
function snapshot(){
 return {
  sessionFromTrustedAuthority:{sessionId,principalId:principal,
   status:"ACTIVE",version:3,issuedAtMs:1000,expiresAtMs:5000,
   activeAccountId:account},
  accountFromTrustedStore:{accountId:account,legalOwnerId:principal,
   type:"PERSONAL",displayName:"Personal",status:"ACTIVE",
   verificationStatus:"VERIFIED"},
  membershipFromTrustedStore:{accountId:account,principalId:principal,
   role:"PERSONAL_OWNER",status:"ACTIVE"},
  walletFromTrustedStore:{id:wallet,accountId:account},
  journalFromTrustedStore:{id:journal,accountId:account},
  serverTimeMs:2000
 };
}
const row=()=>({accountId:account,walletId:wallet,currency:"GBP",
 availableMinor:"0",asOfRevision:9});
function setup({read,first,last}={}){
 let snapshots=0,reads=0;
 const svc=create({
  authority:{async snapshot(){
   snapshots++;return snapshots===1?(first??snapshot()):(last??snapshot());
  }},
  storage:{async readBalance(input){
   reads++;return read?await read(input):{
    readOnlyTransaction:true,actorBoundRls:true,rows:[row()]
   };
  }}
 });
 return {svc,get reads(){return reads;},get snapshots(){return snapshots;}};
}
const request=()=>({request:Object.freeze({opaqueRequestId:"test"}),
 requestedAccountId:account});
test("valid trusted read preserves zero minor units and returns bounded display-only output",async()=>{
 const x=setup();
 const result=await x.svc.read(request());
 assert.equal(result.accountId,account);
 assert.equal(result.walletId,wallet);
 assert.equal(result.availableMinor,"0");
 assert.equal(result.currency,"GBP");
 assert.equal(result.asOfRevision,9);
 assert.equal(result.financialExecutionAuthorised,false);
 assert.equal(result.productionReady,false);
 assert.equal(result.dataSourceProvenanceVerifiedByThisModule,false);
 assert.equal(x.reads,1);assert.equal(x.snapshots,2);
 assert.ok(Object.isFrozen(result));
});
test("backend read passes account and session context, never forged browser ids",async()=>{
 let captured;
 const x=setup({read:async p=>{
  captured=p;
  return {readOnlyTransaction:true,actorBoundRls:true,rows:[row()]};
 }});
 await x.svc.read(request());
 assert.equal(captured.principalId,principal);
 assert.equal(captured.walletId,wallet);
 assert.equal(captured.accountId,account);
 assert.equal(captured.sessionVersion,3);
 assert.equal(captured.requiresRlsBoundRead,true);
 assert.ok(Object.isFrozen(captured));
});
test("wrong requested account is denied before any storage read",async()=>{
 const x=setup();
 await assert.rejects(x.svc.read({...request(),requestedAccountId:other}),
  /PAY54_WALLET_BALANCE_READ_UNAVAILABLE/);
 assert.equal(x.reads,0);
});
test("revoke, switch, expiry or membership denial during an in-flight read never returns data",async()=>{
 const candidates=[
  {...snapshot(),sessionFromTrustedAuthority:{...snapshot().sessionFromTrustedAuthority,status:"REVOKED"}},
  {...snapshot(),sessionFromTrustedAuthority:{...snapshot().sessionFromTrustedAuthority,activeAccountId:other}},
  {...snapshot(),sessionFromTrustedAuthority:{...snapshot().sessionFromTrustedAuthority,version:4}},
  {...snapshot(),serverTimeMs:6000},
  {...snapshot(),membershipFromTrustedStore:{...snapshot().membershipFromTrustedStore,status:"REVOKED"}},
  {...snapshot(),walletFromTrustedStore:{id:wallet,accountId:other}}
 ];
 for(const last of candidates){
  const x=setup({last});
  await assert.rejects(x.svc.read(request()),/PAY54_WALLET_BALANCE_READ_UNAVAILABLE/);
  assert.equal(x.reads,1);
 }
});
test("untrusted and unscoped storage output is denied",async()=>{
 const attempts=[
  {readOnlyTransaction:false,actorBoundRls:true,rows:[row()]},
  {readOnlyTransaction:true,actorBoundRls:false,rows:[row()]},
  {readOnlyTransaction:true,actorBoundRls:true,rows:[]},
  {readOnlyTransaction:true,actorBoundRls:true,rows:[row(),row()]},
  {readOnlyTransaction:true,actorBoundRls:true,rows:[{...row(),accountId:other}]},
  {readOnlyTransaction:true,actorBoundRls:true,rows:[{...row(),walletId:other}]},
  {readOnlyTransaction:true,actorBoundRls:true,rows:[{...row(),currency:"<img>"}]},
  {readOnlyTransaction:true,actorBoundRls:true,rows:[{...row(),availableMinor:"NaN"}]},
  {readOnlyTransaction:true,actorBoundRls:true,rows:[{...row(),availableMinor:"-1"}]},
  {readOnlyTransaction:true,actorBoundRls:true,rows:[{...row(),availableMinor:"1e9"}]},
  {readOnlyTransaction:true,actorBoundRls:true,rows:[{...row(),asOfRevision:0}]},
  {readOnlyTransaction:true,actorBoundRls:true,rows:[{...row(),secret:"bad"}]}
 ];
 for(const result of attempts){
  const x=setup({read:async()=>result});
  await assert.rejects(x.svc.read(request()),/PAY54_WALLET_BALANCE_READ_UNAVAILABLE/);
 }
});
test("backend exceptions are redacted and never expose credentials",async()=>{
 const x=setup({read:async()=>{throw Error("PRIVATE_DATABASE_PASSWORD");}});
 await assert.rejects(x.svc.read(request()),
  error=>error.message==="PAY54_WALLET_BALANCE_READ_UNAVAILABLE");
});
test("missing verified authority or storage refuses construction",()=>{
 assert.throws(()=>create({authority:{},storage:{}}),
  /PAY54_WALLET_BALANCE_READ_UNAVAILABLE/);
});
