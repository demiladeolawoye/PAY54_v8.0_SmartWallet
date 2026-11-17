"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {proposePay54AccountSelection}
 from "../domain/account-context-selection.mjs";

const actor="11111111-1111-4111-8111-111111111111";
const other="99999999-9999-4999-8999-999999999999";
const personalId="22222222-2222-4222-8222-222222222222";
const businessId="33333333-3333-4333-8333-333333333333";
const account=(type,id,owner=actor)=>({
  accountId:id,legalOwnerId:owner,type,displayName:type==="BUSINESS"?"PAY54 Business":"PAY54 Personal",
  status:"ACTIVE",verificationStatus:"VERIFIED"
});
const member=(id,role,principalId=actor,status="ACTIVE")=>({
  accountId:id,role,principalId,status
});

test("756: legitimate personal owner and business viewer receive read-only selection proposals",()=>{
  for(const [a,m] of [
    [account("PERSONAL",personalId),member(personalId,"PERSONAL_OWNER")],
    [account("BUSINESS",businessId),member(businessId,"BUSINESS_VIEWER")]
  ]){
    const proposal=proposePay54AccountSelection({
      authenticatedPrincipalId:actor,requestedAccountId:a.accountId,
      accountFromTrustedStore:a,membershipFromTrustedStore:m
    });
    assert.equal(proposal.accountId,a.accountId);
    assert.equal(proposal.financialOperationAuthorised,false);
    assert.equal(proposal.browserAccountSwitchCompleted,false);
    assert.equal(proposal.requiresIndependentRlsEnforcement,true);
    assert.equal(proposal.productionReady,false);
    assert.ok(Object.isFrozen(proposal));
  }
});
test("756: wrong actor, wrong target ID and forged personal-owner business role fail closed",()=>{
  const a=account("BUSINESS",businessId);
  for(const input of [
    {authenticatedPrincipalId:other,requestedAccountId:businessId,accountFromTrustedStore:a,membershipFromTrustedStore:member(businessId,"BUSINESS_OWNER")},
    {authenticatedPrincipalId:actor,requestedAccountId:personalId,accountFromTrustedStore:a,membershipFromTrustedStore:member(businessId,"BUSINESS_OWNER")},
    {authenticatedPrincipalId:actor,requestedAccountId:businessId,accountFromTrustedStore:a,membershipFromTrustedStore:member(businessId,"PERSONAL_OWNER")}
  ]) assert.throws(()=>proposePay54AccountSelection(input),/ACCESS_DENIED/);
});
test("756: suspended, invited, unverified and closed accounts cannot be selected",()=>{
  const a=account("BUSINESS",businessId),m=member(businessId,"BUSINESS_OWNER");
  for(const input of [
    {accountFromTrustedStore:a,membershipFromTrustedStore:{...m,status:"SUSPENDED"}},
    {accountFromTrustedStore:a,membershipFromTrustedStore:{...m,status:"INVITED"}},
    {accountFromTrustedStore:{...a,status:"SUSPENDED"},membershipFromTrustedStore:m},
    {accountFromTrustedStore:{...a,status:"CLOSED"},membershipFromTrustedStore:m},
    {accountFromTrustedStore:{...a,status:"ACTIVE",verificationStatus:"NOT_VERIFIED"},membershipFromTrustedStore:m}
  ]) assert.throws(()=>proposePay54AccountSelection({
      authenticatedPrincipalId:actor,requestedAccountId:businessId,...input
    }),/ACCESS_DENIED/);
});
test("756: malformed ids and untrusted account/membership shapes are rejected",()=>{
  assert.throws(()=>proposePay54AccountSelection({}),/IDENTITY_REQUIRED/);
  assert.throws(()=>proposePay54AccountSelection({
    authenticatedPrincipalId:actor,requestedAccountId:businessId,
    accountFromTrustedStore:{...account("BUSINESS",businessId),balance:5000},
    membershipFromTrustedStore:member(businessId,"BUSINESS_OWNER")
  }),/ACCESS_DENIED/);
});
