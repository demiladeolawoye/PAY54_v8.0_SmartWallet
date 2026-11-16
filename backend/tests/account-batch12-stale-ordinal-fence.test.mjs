"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createAccountViewResponseFence}
 from "../../assets/js/dashboard/account-view-response-fence.mjs";
const ACCOUNT="123e4567-e89b-42d3-a456-426614174000";
const OTHER="123e4567-e89b-42d3-a456-426614174001";
const read=(fence,resource="balance")=>
 fence.beginRead({accountId:ACCOUNT,principalVersion:7,resource});
const response=(fence,ticket,resource="balance")=>
 fence.acceptResponse(ticket,{accountId:ACCOUNT,principalVersion:7,resource});
test("344: second request supersedes first request for the same account and resource",()=>{
 const fence=createAccountViewResponseFence();
 fence.onAccountConfirmed({accountId:ACCOUNT,principalVersion:7});
 const first=read(fence);
 const second=read(fence);
 assert.equal(response(fence,second).acceptedForPresentation,true);
 const stale=response(fence,first);
 assert.equal(stale.acceptedForPresentation,false);
 assert.equal(stale.reason,"STALE_OR_DIFFERENT_ACCOUNT");
 assert.equal(stale.financialExecutionEnabled,false);
 assert.equal(stale.serverResponseAuthenticated,false);
});
test("344: a late newer response cannot restore an already accepted superseded request",()=>{
 const fence=createAccountViewResponseFence();
 fence.onAccountConfirmed({accountId:ACCOUNT,principalVersion:7});
 const first=read(fence);
 const second=read(fence);
 assert.equal(response(fence,first).acceptedForPresentation,false);
 assert.equal(response(fence,second).acceptedForPresentation,true);
});
test("344: unrelated resource requests do not override each other",()=>{
 const fence=createAccountViewResponseFence();
 fence.onAccountConfirmed({accountId:ACCOUNT,principalVersion:7});
 const balance=read(fence,"balance");
 const cards=read(fence,"cards");
 assert.equal(response(fence,cards,"cards").acceptedForPresentation,true);
 assert.equal(response(fence,balance,"balance").acceptedForPresentation,true);
});
test("344: new account context invalidates all previous resource tickets",()=>{
 const fence=createAccountViewResponseFence();
 fence.onAccountConfirmed({accountId:ACCOUNT,principalVersion:7});
 const balance=read(fence);
 const cards=read(fence,"cards");
 fence.onSwitchRequested();
 fence.onAccountConfirmed({accountId:OTHER,principalVersion:8});
 assert.equal(response(fence,balance).acceptedForPresentation,false);
 assert.equal(response(fence,cards,"cards").acceptedForPresentation,false);
});
test("344: replay and forged read ticket remain rejected",()=>{
 const fence=createAccountViewResponseFence();
 fence.onAccountConfirmed({accountId:ACCOUNT,principalVersion:7});
 const first=read(fence);
 response(fence,first);
 assert.throws(()=>response(fence,first),/PAY54_ACCOUNT_VIEW_TICKET_INVALID/);
 assert.throws(()=>response(fence,{...first}),/PAY54_ACCOUNT_VIEW_TICKET_INVALID/);
});
