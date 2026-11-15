"use strict";
import test from "node:test";import assert from "node:assert/strict";
import {evaluatePersonalWalletAccess} from "../domain/account-wallet-eligibility.mjs";
const P="11111111-1111-4111-8111-111111111111",A="22222222-2222-4222-8222-222222222222",
 W="33333333-3333-4333-8333-333333333333",OTHER="44444444-4444-4444-8444-444444444444";
const account={accountId:A,type:"PERSONAL",legalOwnerId:P,status:"ACTIVE",verificationStatus:"VERIFIED",displayName:"Personal"};
const membership={accountId:A,principalId:P,role:"PERSONAL_OWNER",status:"ACTIVE"};
const wallet={id:W,ownerSubject:P,status:"ACTIVE"};
const binding={accountId:A,walletId:W};
test("business account cannot reuse legacy personal wallet binding",()=>{
 const result=evaluatePersonalWalletAccess({principalId:P,account:{...account,type:"BUSINESS"},
   membership:{...membership,role:"BUSINESS_OWNER"},wallet,binding});
 assert.equal(result.allowed,false);
 assert.equal(result.financialExecutionEnabled,false);
});
test("cross-owner wallet and cross-business binding are invisible",()=>{
 for(const change of [
  {wallet:{...wallet,ownerSubject:OTHER}},
  {binding:{...binding,accountId:OTHER}},
  {binding:{...binding,walletId:OTHER}},
  {membership:{...membership,principalId:OTHER}},
  {account:{...account,legalOwnerId:OTHER}}
 ]){
  const result=evaluatePersonalWalletAccess({principalId:P,account,membership,wallet,binding,...change});
  assert.equal(result.allowed,false);
 }
});
