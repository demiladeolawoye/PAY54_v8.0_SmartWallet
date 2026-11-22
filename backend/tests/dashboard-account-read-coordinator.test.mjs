"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createPay54DashboardAccountReadCoordinator as make}
 from "../../assets/js/dashboard/account-read-coordinator.mjs";
const A="11111111-1111-4111-8111-111111111111";
const B="22222222-2222-4222-8222-222222222222";
const defer=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
test("current account read is rendered once and never enables payment",async()=>{
 const f=make();const output=[];f.confirmAccount({accountId:A,principalVersion:2});
 const result=await f.read({accountId:A,principalVersion:2,resource:"balance",
  load:async()=>({totalMinor:"12345"}),render:x=>output.push(x.totalMinor)});
 assert.deepEqual(output,["12345"]);assert.equal(result.status,"RENDERED");
 assert.equal(result.financialExecutionEnabled,false);
 assert.equal(f.snapshot().activeReadCount,0);
});
test("switch cancels pending account A, preventing stale balance leak into B",async()=>{
 const d=defer(), f=make();const displayed=[];
 f.confirmAccount({accountId:A,principalVersion:2});
 const a=f.read({accountId:A,principalVersion:2,resource:"balance",
  load:async()=>d.promise,render:x=>displayed.push(x)});
 f.onSwitchRequested();f.confirmAccount({accountId:B,principalVersion:3});
 const b=await f.read({accountId:B,principalVersion:3,resource:"balance",
  load:async()=>({owner:B}),render:x=>displayed.push(x.owner)});
 d.resolve({owner:A});
 const old=await a;
 assert.equal(b.status,"RENDERED");assert.equal(old.status,"STALE");
 assert.deepEqual(displayed,[B]);
});
test("same-resource out-of-order responses show only newest",async()=>{
 const d=defer(),f=make(),out=[];
 f.confirmAccount({accountId:A,principalVersion:1});
 const old=f.read({accountId:A,principalVersion:1,resource:"transactions",
  load:async()=>d.promise,render:x=>out.push(x)});
 const next=await f.read({accountId:A,principalVersion:1,resource:"transactions",
  load:async()=>["new"],render:x=>out.push(x[0])});
 d.resolve(["old"]);
 assert.equal((await old).status,"STALE");assert.equal(next.status,"RENDERED");
 assert.deepEqual(out,["new"]);
});
test("unrelated resources may complete independently",async()=>{
 const f=make(),d=defer(),out=[];
 f.confirmAccount({accountId:A,principalVersion:1});
 const a=f.read({accountId:A,principalVersion:1,resource:"balance",
  load:async()=>d.promise,render:x=>out.push(x)});
 const b=await f.read({accountId:A,principalVersion:1,resource:"cards",
  load:async()=>["card"],render:x=>out.push(x[0])});
 d.resolve("balance");
 assert.equal((await a).status,"RENDERED");assert.equal(b.status,"RENDERED");
 assert.deepEqual(out,["card","balance"]);
});
test("logout, principal change, failed verification and close invalidate pending reads",async()=>{
 for(const method of ["onLogout","onPrincipalChanged","onVerificationFailed","close"]){
  const f=make(),d=defer(),out=[];
  f.confirmAccount({accountId:A,principalVersion:1});
  const a=f.read({accountId:A,principalVersion:1,resource:"wallets",
   load:async()=>d.promise,render:x=>out.push(x)});
  f[method]();d.resolve("sensitive");
  assert.equal((await a).status,"STALE");assert.deepEqual(out,[]);
  assert.equal(f.snapshot().selectedAccountId,null);
  assert.equal(f.snapshot().activeReadCount,0);
 }
});
test("unknown accounts, wrong epochs, invalid resources and callbacks fail closed",async()=>{
 const f=make();
 f.confirmAccount({accountId:A,principalVersion:2});
 for(const input of [
  {accountId:B,principalVersion:2,resource:"balance",load:async()=>1,render:()=>{}},
  {accountId:A,principalVersion:1,resource:"balance",load:async()=>1,render:()=>{}},
  {accountId:A,principalVersion:2,resource:"transfer",load:async()=>1,render:()=>{}},
  {accountId:A,principalVersion:2,resource:"balance",load:null,render:()=>{}}
 ])await assert.rejects(f.read(input),/PAY54_DASHBOARD_ACCOUNT_READ_DENIED/);
 assert.equal(f.snapshot().activeReadCount,0);
});
test("invalid confirmation does not retain previous selected account",()=>{
 const f=make();f.confirmAccount({accountId:A,principalVersion:2});
 assert.throws(()=>f.confirmAccount({accountId:"wrong",principalVersion:3}),
  /PAY54_ACCOUNT_VIEW_CONFIRMATION_INVALID/);
 assert.equal(f.snapshot().selectedAccountId,null);
});
test("loader exceptions are redacted; failed reads always release resource",async()=>{
 const f=make();f.confirmAccount({accountId:A,principalVersion:2});
 await assert.rejects(f.read({accountId:A,principalVersion:2,resource:"balance",
  load:async()=>{throw Error("SECRET_TOKEN_DO_NOT_LEAK");},render:()=>{}}),
  err=>err.message==="PAY54_DASHBOARD_ACCOUNT_READ_DENIED");
 assert.equal(f.snapshot().activeReadCount,0);
});
test("asynchronous renderers are rejected",async()=>{
 const f=make();f.confirmAccount({accountId:A,principalVersion:2});
 await assert.rejects(f.read({accountId:A,principalVersion:2,resource:"balance",
  load:async()=>1,render:async()=>1}),/PAY54_DASHBOARD_ACCOUNT_READ_DENIED/);
});
