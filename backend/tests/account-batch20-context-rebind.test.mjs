"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {proposePay54AccountSelection}
 from "../domain/account-context-selection.mjs";
import {planPay54TrustedAccountRebind}
 from "../domain/account-context-rebind.mjs";

const principal="11111111-1111-4111-8111-111111111111";
const business="33333333-3333-4333-8333-333333333333";
const personal="22222222-2222-4222-8222-222222222222";
const sessionId="44444444-4444-4444-8444-444444444444";
const proposal=proposePay54AccountSelection({
  authenticatedPrincipalId:principal,requestedAccountId:business,
  accountFromTrustedStore:{accountId:business,legalOwnerId:principal,type:"BUSINESS",
   displayName:"PAY54 Business",status:"ACTIVE",verificationStatus:"VERIFIED"},
  membershipFromTrustedStore:{accountId:business,principalId:principal,
   role:"BUSINESS_VIEWER",status:"ACTIVE"}
});
const session=()=>({sessionId,principalId:principal,activeAccountId:personal,
  status:"ACTIVE",version:7,expiresAtMs:200000});
const review=(values={})=>planPay54TrustedAccountRebind({
  selectionProposal:proposal,currentSessionFromTrustedStore:session(),
  serverTimeMs:100000,authoritativeSessionVersion:7,...values
});
test("758: authorisation proposal can create a plan but NEVER commit account/session",()=>{
 const r=review();
 assert.equal(r.candidateAccountId,business);
 assert.equal(r.expectedSessionVersion,7);
 assert.equal(r.requiresAtomicCompareAndSwap,true);
 assert.equal(r.requiresOldSessionRevocation,true);
 assert.equal(r.requiresTrustedRlsScopeReset,true);
 assert.equal(r.sessionRebound,false);
 assert.equal(r.csrfValidated,false);
 assert.equal(r.replayFenceValidated,false);
 assert.equal(r.productionReady,false);
 assert.ok(Object.isFrozen(r));
});
test("758: session from different principal or revoked/expired session is refused",()=>{
 for(const s of [
  {...session(),principalId:"99999999-9999-4999-8999-999999999999"},
  {...session(),status:"REVOKED"},
  {...session(),status:"EXPIRED"},
  {...session(),expiresAtMs:99999}
 ]) assert.throws(()=>review({currentSessionFromTrustedStore:s}),/ACCESS_DENIED/);
});
test("758: stale session version denies replay and double-selection races",()=>{
 assert.throws(()=>review({authoritativeSessionVersion:8}),/ACCESS_DENIED/);
 assert.throws(()=>review({currentSessionFromTrustedStore:{...session(),version:6}}),/ACCESS_DENIED/);
});
test("758: same already-selected account is a no-op, not a reissue",()=>{
 assert.throws(()=>review({
  currentSessionFromTrustedStore:{...session(),activeAccountId:business}
 }),/NO_OP/);
});
test("758: forged client proposal, missing clock and invalid session type fail",()=>{
 assert.throws(()=>planPay54TrustedAccountRebind({
  selectionProposal:{...proposal,productionReady:true},
  currentSessionFromTrustedStore:session(),serverTimeMs:100000,
  authoritativeSessionVersion:7
 }),/PROPOSAL_INVALID/);
 assert.throws(()=>review({serverTimeMs:NaN}),/ACCESS_DENIED/);
 assert.throws(()=>review({currentSessionFromTrustedStore:null}),/ACCESS_DENIED/);
});
