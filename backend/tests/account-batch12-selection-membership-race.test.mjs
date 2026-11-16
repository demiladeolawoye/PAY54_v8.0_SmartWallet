"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createAccountSelectionIntentPolicy}
 from "../domain/account-selection-intent.mjs";
import {createAccountContextReader}
 from "../domain/account-context-reader.mjs";
import {createTrustedAccountPrincipalResolver,requireTrustedPrincipal}
 from "../domain/trusted-account-principal.mjs";
import {createAuthenticatedAccountSelectionReview}
 from "../domain/account-selection-authenticated-review.mjs";
const P="11111111-1111-4111-8111-111111111111";
const A="22222222-2222-4222-8222-222222222222";
const OWNER="44444444-4444-4444-8444-444444444444";
const initial={
 account_id:A,legal_owner_id:OWNER,type:"BUSINESS",
 display_name:"PAY54 Business",status:"ACTIVE",
 verification_status:"VERIFIED",principal_id:P,
 role:"BUSINESS_VIEWER",membership_status:"ACTIVE"
};
function create({revokeAfterFirst=false,replaceOwner=false}={}){
 let reads=0;
 const resolver=createTrustedAccountPrincipalResolver({
  verifyServerSession:async request=>({
   subjectId:P,authenticated:request.active===true,revoked:false,
   expiresAt:Math.floor(Date.now()/1000)+60
  })
 });
 const reader=createAccountContextReader({
  resolveAuthenticatedPrincipal:async request=>
   requireTrustedPrincipal(await resolver.resolve(request)),
  query:async ()=>{
   reads++;
   const row={...initial};
   if(reads>=2 && revokeAfterFirst)row.membership_status="REVOKED";
   if(reads>=2 && replaceOwner)row.legal_owner_id=P;
   return {rows:[row]};
  }
 });
 const policy=createAccountSelectionIntentPolicy();
 const review=createAuthenticatedAccountSelectionReview({
  selectionPolicy:policy,accountReader:reader,principalResolver:resolver
 });
 return {review,policy,getReads:()=>reads};
}
test("348: newly revoked Business membership is denied after first approved read",async()=>{
 const x=create({revokeAfterFirst:true});
 const intent=x.policy.issue({accountId:A});
 await assert.rejects(x.review.review({
  request:{active:true},selectionIntent:intent
 }),/ACCOUNT_SELECTION_REVIEW_DENIED/);
 assert.equal(x.getReads(),2);
 await assert.rejects(x.review.review({
  request:{active:true},selectionIntent:intent
 }),/ACCOUNT_SELECTION_REVIEW_DENIED/);
});
test("348: changed business legal owner between reads invalidates selection",async()=>{
 const x=create({replaceOwner:true});
 await assert.rejects(x.review.review({
  request:{active:true},
  selectionIntent:x.policy.issue({accountId:A})
 }),/ACCOUNT_SELECTION_REVIEW_DENIED/);
 assert.equal(x.getReads(),2);
});
test("348: stable authorised business viewer remains display-only",async()=>{
 const x=create();
 const result=await x.review.review({
  request:{active:true},selectionIntent:x.policy.issue({accountId:A})
 });
 assert.equal(result.account.type,"BUSINESS");
 assert.equal(result.membershipRechecked,true);
 assert.equal(result.identityRechecked,true);
 assert.equal(result.reviewOnly,true);
 assert.equal(result.sessionSwitched,false);
 assert.equal(result.financialExecutionEnabled,false);
 assert.equal(result.customerDataAccessEnabled,false);
 assert.equal(x.getReads(),2);
});
