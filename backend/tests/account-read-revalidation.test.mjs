"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createAccountReadRevalidation} from "../domain/account-read-revalidation.mjs";
const A="22222222-2222-4222-8222-222222222222";
const B="33333333-3333-4333-8333-333333333333";
const W="44444444-4444-4444-8444-444444444444";
const account={accountId:A,type:"PERSONAL",status:"ACTIVE",verificationStatus:"VERIFIED"};
const create=({readAccount=async()=>account,readWallets=async()=>[W]}={})=>
 createAccountReadRevalidation({
  accountReader:{selectForRequest:readAccount},
  walletReader:{eligibleWalletIds:readWallets}
 });
test("revalidated account/wallet intent can never authorise money movement",async()=>{
 const result=await create().revalidate({request:{},accountId:A,walletId:W});
 assert.equal(result.presentationEligible,true);
 assert.equal(result.transactionAuthorised,false);
 assert.equal(result.financialExecutionEnabled,false);
 assert.equal(result.consistency,"NON_ATOMIC_PREVIEW_ONLY");
 assert.ok(Object.isFrozen(result));
});
test("revocation and identity-changing account records deny immediately",async()=>{
 for(const actual of [
  null,{...account,status:"SUSPENDED"},
  {...account,verificationStatus:"REJECTED"},
  {...account,accountId:B}
 ]){
   await assert.rejects(()=>create({readAccount:async()=>actual}).revalidate({
     request:{},accountId:A}),/ACCOUNT_NOT_AVAILABLE/);
 }
});
test("denied wallet and business account cannot be turned into presentation eligibility",async()=>{
 await assert.rejects(()=>create({readWallets:async()=>[]}).revalidate({
   request:{},accountId:A,walletId:W}),/WALLET_ACCESS_DENIED/);
 await assert.rejects(()=>create({readAccount:async()=>({...account,type:"BUSINESS"})}).revalidate({
   request:{},accountId:A,walletId:W}),/WALLET_ACCESS_DENIED/);
 await assert.rejects(()=>create().revalidate({request:{},accountId:"bad"}),/INVALID_ACCOUNT_SELECTION/);
});
test("backend read errors propagate without fallback to cached account selections",async()=>{
 const reader=create({readAccount:async()=>{throw new Error("ACCOUNT_NOT_AVAILABLE")}});
 await assert.rejects(()=>reader.revalidate({request:{},accountId:A}),/ACCOUNT_NOT_AVAILABLE/);
});
