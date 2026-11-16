"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createAccountViewResponseFence}
 from "../../assets/js/dashboard/account-view-response-fence.mjs";

const personal="123e4567-e89b-42d3-a456-426614174000";
const business="123e4567-e89b-42d3-a456-426614174001";
test("331: an accepted read is single use, scoped, and never financial authority",()=>{
 const fence=createAccountViewResponseFence();
 fence.onAccountConfirmed({accountId:personal,principalVersion:1});
 const ticket=fence.beginRead({accountId:personal,principalVersion:1,resource:"balance"});
 const result=fence.acceptResponse(ticket,{
  accountId:personal,principalVersion:1,resource:"balance"
 });
 assert.equal(result.acceptedForPresentation,true);
 assert.equal(result.serverResponseAuthenticated,false);
 assert.equal(result.financialExecutionEnabled,false);
 assert.throws(()=>fence.acceptResponse(ticket,{
  accountId:personal,principalVersion:1,resource:"balance"
 }),/PAY54_ACCOUNT_VIEW_TICKET_INVALID/);
});
test("331: old Personal account read never appears under Business context",()=>{
 const fence=createAccountViewResponseFence();
 fence.onAccountConfirmed({accountId:personal,principalVersion:1});
 const ticket=fence.beginRead({accountId:personal,principalVersion:1,resource:"transactions"});
 fence.onSwitchRequested();
 assert.equal(fence.snapshot().hasSelectedAccount,false);
 assert.throws(()=>fence.beginRead({
  accountId:business,principalVersion:1,resource:"transactions"
 }),/PAY54_ACCOUNT_VIEW_NOT_CURRENT/);
 fence.onAccountConfirmed({accountId:business,principalVersion:2});
 const stale=fence.acceptResponse(ticket,{
  accountId:personal,principalVersion:1,resource:"transactions"
 });
 assert.equal(stale.acceptedForPresentation,false);
 assert.equal(stale.reason,"STALE_OR_DIFFERENT_ACCOUNT");
 const current=fence.beginRead({accountId:business,principalVersion:2,resource:"transactions"});
 assert.equal(fence.acceptResponse(current,{
  accountId:business,principalVersion:2,resource:"transactions"
 }).acceptedForPresentation,true);
});
test("331: logout, principal change and failed verification revoke outstanding read",()=>{
 for(const transition of ["onLogout","onPrincipalChanged","onVerificationFailed"]){
  const fence=createAccountViewResponseFence();
  fence.onAccountConfirmed({accountId:personal,principalVersion:11});
  const ticket=fence.beginRead({accountId:personal,principalVersion:11,resource:"cards"});
  fence[transition]();
  assert.equal(fence.snapshot().selectedAccountId,null);
  assert.equal(fence.acceptResponse(ticket,{
   accountId:personal,principalVersion:11,resource:"cards"
  }).acceptedForPresentation,false);
 }
});
test("331: forged or wrong resource and epoch are denied",()=>{
 const fence=createAccountViewResponseFence();
 fence.onAccountConfirmed({accountId:personal,principalVersion:3});
 assert.throws(()=>fence.beginRead({
  accountId:personal,principalVersion:2,resource:"cards"
 }),/PAY54_ACCOUNT_VIEW_NOT_CURRENT/);
 assert.throws(()=>fence.beginRead({
  accountId:personal,principalVersion:3,resource:"admin"
 }),/PAY54_ACCOUNT_VIEW_NOT_CURRENT/);
 assert.throws(()=>fence.acceptResponse(Object.freeze({
  accountId:personal,resource:"balance"
 }),{
  accountId:personal,principalVersion:3,resource:"balance"
 }),/PAY54_ACCOUNT_VIEW_TICKET_INVALID/);
 const ticket=fence.beginRead({accountId:personal,principalVersion:3,resource:"recipients"});
 assert.equal(fence.acceptResponse(ticket,{
  accountId:personal,principalVersion:3,resource:"balance"
 }).acceptedForPresentation,false);
});
test("331: invalid confirmation must not create or change account view",()=>{
 const fence=createAccountViewResponseFence();
 for(const accountId of ["wrong",undefined,business.slice(0,-1)]){
  assert.throws(()=>fence.onAccountConfirmed({accountId,principalVersion:1}),
   /PAY54_ACCOUNT_VIEW_CONFIRMATION_INVALID/);
 }
 assert.equal(fence.snapshot().hasSelectedAccount,false);
});
