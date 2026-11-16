"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createAccountViewCache}
 from "../../assets/js/dashboard/account-view-cache.mjs";
import {createAccountViewResponseFence}
 from "../../assets/js/dashboard/account-view-response-fence.mjs";
import {createAccountSwitchPreview}
 from "../../assets/js/dashboard/account-switch-selection.mjs";

const personal="123e4567-e89b-42d3-a456-426614174000";
const business="123e4567-e89b-42d3-a456-426614174001";
const options=[
 {accountId:personal,displayName:"Personal",type:"PERSONAL"},
 {accountId:business,displayName:"Business",type:"BUSINESS"}
];

test("337: read cached Personal display cannot leak into a pending Business switch",()=>{
 const cache=createAccountViewCache();
 const fence=createAccountViewResponseFence();
 cache.setDisplayOptions(options);
 fence.onAccountConfirmed({accountId:personal,principalVersion:5});
 const inFlight=fence.beginRead({accountId:personal,principalVersion:5,resource:"balance"});
 const intent=cache.requestSwitch(business);
 fence.onSwitchRequested();
 assert.equal(intent.pendingBackendVerification,true);
 assert.equal(intent.effectiveAccountChanged,false);
 assert.equal(intent.financialExecutionEnabled,false);
 assert.deepEqual(cache.snapshot().accounts,[]);
 assert.equal(fence.snapshot().hasSelectedAccount,false);
 assert.equal(fence.acceptResponse(inFlight,{
  accountId:personal,principalVersion:5,resource:"balance"
 }).acceptedForPresentation,false);
 assert.throws(()=>fence.beginRead({accountId:business,principalVersion:5,resource:"balance"}),
  /PAY54_ACCOUNT_VIEW_NOT_CURRENT/);
});
test("337: preview-only picker never creates financial authority or verified membership",()=>{
 const picker=createAccountSwitchPreview({
  accountIds:[personal,business],selectedAccountId:personal
 });
 let s=picker.reduce(picker.initialState,{type:"OPEN"});
 s=picker.reduce(s,{type:"ARROW_DOWN"});
 const selection=picker.createSelectionIntent(s);
 assert.equal(selection.requestedAccountId,business);
 assert.equal(selection.pendingServerAuthorisation,true);
 assert.equal(selection.financialExecutionEnabled,false);
 assert.equal(selection.accountContextChanged,false);
 assert.equal(s.effectiveFinancialContextChanged,false);
});
test("337: principal change and logout invalidate both cache and pending responses",()=>{
 for(const event of ["onPrincipalChanged","onLogout"]){
  const cache=createAccountViewCache();
  const fence=createAccountViewResponseFence();
  cache.setDisplayOptions(options);
  fence.onAccountConfirmed({accountId:personal,principalVersion:7});
  const pending=fence.beginRead({accountId:personal,principalVersion:7,resource:"recipients"});
  cache[event==="onLogout"?"onLogout":"onPrincipalChange"]();
  fence[event]();
  assert.equal(cache.snapshot().accounts.length,0);
  assert.equal(fence.acceptResponse(pending,{
   accountId:personal,principalVersion:7,resource:"recipients"
  }).acceptedForPresentation,false);
 }
});
