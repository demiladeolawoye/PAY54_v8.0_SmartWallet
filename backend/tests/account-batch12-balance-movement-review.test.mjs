"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createTrustedAccountPrincipalResolver,requireTrustedPrincipal}
 from "../domain/trusted-account-principal.mjs";
import {createAccountContextReader}
 from "../domain/account-context-reader.mjs";
import {createAccountBalanceMovementReview}
 from "../domain/account-balance-movement-review.mjs";

const P="11111111-1111-4111-8111-111111111111";
const OTHER="44444444-4444-4444-8444-444444444444";
const PERSONAL="22222222-2222-4222-8222-222222222222";
const BUSINESS="33333333-3333-4333-8333-333333333333";
const ref=1800000000000;
const row={
 account_id:PERSONAL,legal_owner_id:P,type:"PERSONAL",display_name:"My account",
 status:"ACTIVE",verification_status:"VERIFIED",
 principal_id:P,role:"PERSONAL_OWNER",membership_status:"ACTIVE"
};
let clock=1000;
function setup({record=row,snapshotHook,dbHook}={}){
 const resolver=createTrustedAccountPrincipalResolver({
  verifyServerSession:async request=>request.active?
   {subjectId:request.principal??P,authenticated:true,revoked:false,
     expiresAt:Math.floor(Date.now()/1000)+60}:null
 });
 const accountReader=createAccountContextReader({
  query:async()=>{if(dbHook)await dbHook();return {rows:[record]};},
  resolveAuthenticatedPrincipal:async request=>
   requireTrustedPrincipal(await resolver.resolve(request))
 });
 const reviewer=createAccountBalanceMovementReview({
  accountReader,principalResolver:resolver,now:()=>clock,
  loadSnapshots:async input=>{
   if(snapshotHook)return snapshotHook(input);
   return {opening:{accountId:PERSONAL,currency:"NGN",
      asOf:ref-30*86400000,minorUnits:"100000"},
    closing:{accountId:PERSONAL,currency:"NGN",asOf:ref,minorUnits:"124500"}};
  }
 });
 return {reviewer};
}
const args=(request={active:true})=>({
 request,accountId:PERSONAL,currency:"NGN",periodDays:30,referenceAsOf:ref
});
test("346: genuine account-scoped source reader produces review-only amount",async()=>{
 const {reviewer}=setup();
 const result=await reviewer.review(args());
 assert.equal(result.accountId,PERSONAL);
 assert.equal(result.changeMinorUnits,"24500");
 assert.equal(result.percentBasisPoints,"2450");
 assert.equal(result.identityRechecked,true);
 assert.equal(result.accountEligibilityRechecked,true);
 assert.equal(result.safeForCustomerBalancePresentation,false);
 assert.equal(result.ledgerSnapshotProvenanceAttested,false);
 assert.equal(result.operationalDatabaseRlsVerified,false);
 assert.equal(result.financialExecutionEnabled,false);
 assert.ok(Object.isFrozen(result));
});
test("346: unverified login or foreign account cannot read snapshots",async()=>{
 let calls=0;
 const {reviewer}=setup({snapshotHook:async()=>{
  calls++;throw new Error("Sensitive provider details");
 }});
 await assert.rejects(reviewer.review(args({active:false})),/PAY54_BALANCE_REVIEW_DENIED/);
 await assert.rejects(reviewer.review({...args(),accountId:BUSINESS}),
  /PAY54_BALANCE_REVIEW_DENIED/);
 assert.equal(calls,0);
});
test("346: mismatched currency/account opening and closing snapshots deny",async()=>{
 for(const mismatch of [
  {accountId:BUSINESS},
  {currency:"GBP"},
  {asOf:ref+1},
  {minorUnits:"1.250"}
 ]){
  const {reviewer}=setup({snapshotHook:async()=>({
   opening:{accountId:PERSONAL,currency:"NGN",
    asOf:ref-30*86400000,minorUnits:"100000"},
   closing:{accountId:PERSONAL,currency:"NGN",asOf:ref,
    minorUnits:"124500",...mismatch}
  })});
  await assert.rejects(reviewer.review(args()),/PAY54_BALANCE_REVIEW_DENIED/);
 }
});
test("346: identity revocation while snapshots are in flight denies",async()=>{
 const request={active:true};
 const {reviewer}=setup({snapshotHook:async()=>{
  request.active=false;
  return {opening:{accountId:PERSONAL,currency:"NGN",
    asOf:ref-30*86400000,minorUnits:"100000"},
   closing:{accountId:PERSONAL,currency:"NGN",asOf:ref,minorUnits:"124500"}};
 }});
 await assert.rejects(reviewer.review(args(request)),/PAY54_BALANCE_REVIEW_DENIED/);
});
test("346: account membership revocation after first read denies",async()=>{
 let count=0;
 const changed={...row,membership_status:"REVOKED"};
 const resolver=createTrustedAccountPrincipalResolver({
  verifyServerSession:async()=>({subjectId:P,authenticated:true,revoked:false,
    expiresAt:Math.floor(Date.now()/1000)+60})
 });
 const reader=createAccountContextReader({
  resolveAuthenticatedPrincipal:async request=>
   requireTrustedPrincipal(await resolver.resolve(request)),
  query:async()=>{
   count++;
   return {rows:[count===1?row:changed]};
  }
 });
 const reviewer=createAccountBalanceMovementReview({
  accountReader:reader,principalResolver:resolver,
  loadSnapshots:async()=>({
   opening:{accountId:PERSONAL,currency:"NGN",asOf:ref-30*86400000,minorUnits:"0"},
   closing:{accountId:PERSONAL,currency:"NGN",asOf:ref,minorUnits:"100"}
  })
 });
 await assert.rejects(reviewer.review(args()),/PAY54_BALANCE_REVIEW_DENIED/);
 assert.equal(count,2);
});
test("346: timeout and invalid requests fail closed without leakage",async()=>{
 const {reviewer}=setup({snapshotHook:async()=>{
  clock+=2501;
  throw new Error("db-password-is-never-exposed");
 }});
 await assert.rejects(reviewer.review(args()),/PAY54_BALANCE_REVIEW_DENIED/);
 for(const bad of [
  {...args(),currency:"USDT"},
  {...args(),periodDays:14},
  {...args(),accountId:"invalid"},
  {...args(),referenceAsOf:NaN}
 ]){
  await assert.rejects(reviewer.review(bad),/PAY54_BALANCE_REVIEW_DENIED/);
 }
});
