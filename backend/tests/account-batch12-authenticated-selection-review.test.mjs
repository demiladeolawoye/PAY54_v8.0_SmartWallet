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
const PERSONAL="22222222-2222-4222-8222-222222222222";
const BUSINESS="33333333-3333-4333-8333-333333333333";
const OTHER="44444444-4444-4444-8444-444444444444";
let stamp=1000;
const row=(accountId=PERSONAL,type="PERSONAL",principal=P)=>({
 account_id:accountId,legal_owner_id:type==="PERSONAL"?principal:OTHER,
 type,display_name:type==="PERSONAL"?"Personal":"PAY54 Business",
 status:"ACTIVE",verification_status:"VERIFIED",principal_id:principal,
 role:type==="PERSONAL"?"PERSONAL_OWNER":"BUSINESS_VIEWER",
 membership_status:"ACTIVE"
});
function harness({rows=[row()],queryHook,principalHook}={}){
 const selectionPolicy=createAccountSelectionIntentPolicy({now:()=>stamp});
 const principalResolver=createTrustedAccountPrincipalResolver({
  verifyServerSession:async request=>{
   if(principalHook)await principalHook(request);
   if(request.session!==true)return null;
   return {subjectId:request.principal??P,authenticated:true,revoked:false,
    expiresAt:Math.floor(Date.now()/1000)+60};
  }
 });
 const accountReader=createAccountContextReader({
  query:async (sql,params)=>{
   if(queryHook)await queryHook(sql,params);
   return {rows};
  },
  resolveAuthenticatedPrincipal:async request=>
   requireTrustedPrincipal(await principalResolver.resolve(request))
 });
 const service=createAuthenticatedAccountSelectionReview({
  selectionPolicy,accountReader,principalResolver,now:()=>stamp
 });
 return {service,selectionPolicy};
}
test("342: current verified Personal account returns only a non-activating projection",async()=>{
 const {service,selectionPolicy}=harness();
 const selectionIntent=selectionPolicy.issue({accountId:PERSONAL});
 const result=await service.review({request:{session:true},selectionIntent});
 assert.deepEqual(result.account,{
  accountId:PERSONAL,type:"PERSONAL",displayName:"Personal"
 });
 assert.equal(JSON.stringify(result).includes(OTHER),false);
 assert.equal(result.reviewOnly,true);
 assert.equal(result.sessionSwitched,false);
 assert.equal(result.customerDataAccessEnabled,false);
 assert.equal(result.independentDatabaseRlsAttested,false);
 assert.equal(result.financialExecutionEnabled,false);
 assert.ok(Object.isFrozen(result));
 assert.ok(Object.isFrozen(result.account));
});
test("342: authenticated Business VIEWER is eligible for picker but not payments",async()=>{
 const {service,selectionPolicy}=harness({
  rows:[row(BUSINESS,"BUSINESS")]
 });
 const result=await service.review({
  request:{session:true},
  selectionIntent:selectionPolicy.issue({accountId:BUSINESS})
 });
 assert.equal(result.account.type,"BUSINESS");
 assert.equal(result.accountContextChanged,false);
 assert.equal(result.financialExecutionEnabled,false);
});
test("342: unauthorized or suspended membership denied and intent consumed",async()=>{
 for(const membershipStatus of ["SUSPENDED","REVOKED"]){
  const denied=row();
  denied.membership_status=membershipStatus;
  const {service,selectionPolicy}=harness({rows:[denied]});
  const intent=selectionPolicy.issue({accountId:PERSONAL});
  await assert.rejects(service.review({
   request:{session:true},selectionIntent:intent
  }),/ACCOUNT_SELECTION_REVIEW_DENIED/);
  await assert.rejects(service.review({
   request:{session:true},selectionIntent:intent
  }),/ACCOUNT_SELECTION_REVIEW_DENIED/);
 }
});
test("342: forged, replayed, or mismatched selection intents fail",async()=>{
 const {service,selectionPolicy}=harness();
 const input={request:{session:true}};
 await assert.rejects(service.review({
  ...input,selectionIntent:{requestedAccountId:PERSONAL}
 }),/ACCOUNT_SELECTION_REVIEW_DENIED/);
 const wrong=selectionPolicy.issue({accountId:BUSINESS});
 await assert.rejects(service.review({
  ...input,selectionIntent:wrong
 }),/ACCOUNT_SELECTION_REVIEW_DENIED/);
 const good=selectionPolicy.issue({accountId:PERSONAL});
 await service.review({...input,selectionIntent:good});
 await assert.rejects(service.review({
  ...input,selectionIntent:good
 }),/ACCOUNT_SELECTION_REVIEW_DENIED/);
});
test("342: unauthenticated request never becomes a permitted account review",async()=>{
 const {service,selectionPolicy}=harness();
 const intent=selectionPolicy.issue({accountId:PERSONAL});
 await assert.rejects(service.review({
  request:{session:false},selectionIntent:intent
 }),/ACCOUNT_SELECTION_REVIEW_DENIED/);
});
test("342: principal revocation during DB lookup cancels the review",async()=>{
 const request={session:true};
 const {service,selectionPolicy}=harness({
  queryHook:async()=>{request.session=false;}
 });
 await assert.rejects(service.review({
  request,selectionIntent:selectionPolicy.issue({accountId:PERSONAL})
 }),/ACCOUNT_SELECTION_REVIEW_DENIED/);
});
test("342: principal change during DB lookup cancels the review",async()=>{
 const request={session:true,principal:P};
 const {service,selectionPolicy}=harness({
  queryHook:async()=>{request.principal=OTHER;}
 });
 await assert.rejects(service.review({
  request,selectionIntent:selectionPolicy.issue({accountId:PERSONAL})
 }),/ACCOUNT_SELECTION_REVIEW_DENIED/);
});
test("342: expired review interval and selection intent deny",async()=>{
 const {service,selectionPolicy}=harness({
  queryHook:async()=>{stamp+=2500;}
 });
 await assert.rejects(service.review({
  request:{session:true},
  selectionIntent:selectionPolicy.issue({accountId:PERSONAL})
 }),/ACCOUNT_SELECTION_REVIEW_DENIED/);
 const fresh=selectionPolicy.issue({accountId:PERSONAL});
 stamp+=31_000;
 await assert.rejects(service.review({
  request:{session:true},selectionIntent:fresh
 }),/ACCOUNT_SELECTION_REVIEW_DENIED/);
});
