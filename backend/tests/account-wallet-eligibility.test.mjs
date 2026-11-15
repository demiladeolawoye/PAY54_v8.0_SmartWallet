"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {evaluatePersonalWalletAccess} from "../domain/account-wallet-eligibility.mjs";
const P="11111111-1111-4111-8111-111111111111";
const ACCOUNT="22222222-2222-4222-8222-222222222222";
const OTHER="33333333-3333-4333-8333-333333333333";
const W="44444444-4444-4444-8444-444444444444";
const account={accountId:ACCOUNT,legalOwnerId:P,type:"PERSONAL",displayName:"Personal",status:"ACTIVE",verificationStatus:"VERIFIED"};
const membership={accountId:ACCOUNT,principalId:P,role:"PERSONAL_OWNER",status:"ACTIVE"};
const wallet={id:W,ownerSubject:P,status:"ACTIVE"};
const binding={accountId:ACCOUNT,walletId:W};
const check=changes=>evaluatePersonalWalletAccess({principalId:P,account,membership,wallet,binding,...changes});
test("verified personal wallet owner is read-eligible without financial execution",()=>{
 const x=check({});assert.equal(x.allowed,true);assert.equal(x.financialExecutionEnabled,false);
 assert.ok(Object.isFrozen(x));
});
test("revocation, suspension, KYB confusion and cross-owner data fail closed",()=>{
 const cases=[
 {membership:{...membership,status:"REVOKED"}},
 {membership:{...membership,status:"SUSPENDED"}},
 {account:{...account,status:"SUSPENDED"}},
 {account:{...account,type:"BUSINESS"}},
 {wallet:{...wallet,status:"SUSPENDED"}},
 {wallet:{...wallet,ownerSubject:OTHER}},
 {binding:{...binding,accountId:OTHER}},
 {binding:{...binding,walletId:OTHER}},
 {principalId:OTHER}
 ];
 for(const input of cases){const x=check(input);assert.equal(x.allowed,false,JSON.stringify(input));assert.equal(x.financialExecutionEnabled,false);}
});
test("missing wallet or binding is not inferred from account identity",()=>{
 assert.equal(check({wallet:null}).allowed,false);
 assert.equal(check({binding:null}).allowed,false);
});
