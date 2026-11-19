"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {
  assessPay54PersonalPayTagClaimReadiness,
  PAY54_PAYTAG_REGISTRY_READINESS
} from "../domain/paytag-registry-readiness.mjs";

const OWNER="11111111-1111-4111-8111-111111111111";
const OTHER="66666666-6666-4666-8666-666666666666";
const ACCOUNT="22222222-2222-4222-8222-222222222222";
const WALLET="44444444-4444-4444-8444-444444444444";
const account={
  accountId:ACCOUNT,legalOwnerId:OWNER,type:"PERSONAL",
  displayName:"Verified personal",status:"ACTIVE",
  verificationStatus:"VERIFIED"
};
const membership={accountId:ACCOUNT,principalId:OWNER,role:"PERSONAL_OWNER",status:"ACTIVE"};
const wallet={id:WALLET,ownerSubject:OWNER,status:"ACTIVE"};
const binding={accountId:ACCOUNT,walletId:WALLET};
const fixture={principalId:OWNER,account,membership,wallet,binding,proposedTag:"@Alice-11"};

test("Verified personal account is only eligible for a future registry review",()=>{
  const r=assessPay54PersonalPayTagClaimReadiness(fixture);
  assert.equal(r.permittedForRegistryDesignReview,true);
  assert.equal(r.proposedAlias,"alice-11");
  assert.equal(r.accountId,ACCOUNT);
  assert.equal(r.walletId,WALLET);
  assert.equal(r.registryWriteAuthorised,false);
  assert.equal(r.recipientResolutionAuthorised,false);
  assert.equal(r.financialExecutionEnabled,false);
  assert.equal(r.productionRelease,"BLOCKED");
  assert.ok(Object.isFrozen(r));
});

test("No caller input can establish ownership for unknown, unverified or cross-tenant scopes",()=>{
  const denied=[
    {principalId:OTHER},
    {principalId:"untrusted"},
    {account:{...account,type:"BUSINESS"}},
    {account:{...account,status:"SUSPENDED"}},
    {account:{...account,verificationStatus:"NOT_VERIFIED",status:"PENDING_VERIFICATION"}},
    {account:{...account,legalOwnerId:OTHER}},
    {membership:{...membership,principalId:OTHER}},
    {membership:{...membership,status:"REVOKED"}},
    {wallet:{...wallet,ownerSubject:OTHER}},
    {wallet:{...wallet,status:"SUSPENDED"}},
    {binding:{...binding,accountId:OTHER}},
    {binding:{...binding,walletId:OTHER}},
    {wallet:null},
    {binding:null},
    {account:null}
  ];
  for(const change of denied){
    const r=assessPay54PersonalPayTagClaimReadiness({...fixture,...change});
    assert.equal(r.permittedForRegistryDesignReview,false,JSON.stringify(change));
    assert.equal(r.proposedAlias,null);
    assert.equal(r.accountId,null);
    assert.equal(r.walletId,null);
    assert.equal(r.registryWriteAuthorised,false);
    assert.equal(r.financialExecutionEnabled,false);
  }
});

test("Invalid, reserved and confusing aliases fail closed before any disclosure",()=>{
  for(const proposedTag of ["@ab","@admin","@pay54-help","@аlice","@john..doe","@john smith",null]){
    const result=assessPay54PersonalPayTagClaimReadiness({...fixture,proposedTag});
    assert.equal(result.permittedForRegistryDesignReview,false,String(proposedTag));
    assert.equal(result.reason,"INVALID_OR_UNAVAILABLE_TAG");
    assert.equal(result.accountId,null);
    assert.equal(result.walletId,null);
  }
});

test("No ready registry, uniqueness, payment or Business issuance is implied",()=>{
  const p=PAY54_PAYTAG_REGISTRY_READINESS;
  assert.ok(Object.isFrozen(p));
  assert.ok(Object.isFrozen(p.allowedAccountTypes));
  assert.deepEqual(p.allowedAccountTypes,["PERSONAL"]);
  assert.equal(p.canonicalNamespaceUniquenessVerified,false);
  assert.equal(p.databaseOwnershipVerified,false);
  assert.equal(p.accountIsolationVerifiedInRuntime,false);
  assert.equal(p.businessAliasIssuanceApproved,false);
  assert.equal(p.optimisticClientClaimsAccepted,false);
  assert.equal(p.registryWriteAuthorised,false);
  assert.equal(p.recipientResolutionAuthorised,false);
  assert.equal(p.financialExecutionEnabled,false);
  assert.equal(p.productionRelease,"BLOCKED");
});
