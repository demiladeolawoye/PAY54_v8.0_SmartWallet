"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createAccountSelectionIntentPolicy} from "../domain/account-selection-intent.mjs";
const A="22222222-2222-4222-8222-222222222222";
test("one-use preview intent never grants account or financial authority",()=>{
 let clock=1000;const p=createAccountSelectionIntentPolicy({now:()=>clock,maxAgeMs:1000});
 const token=p.issue({accountId:A});
 const result=p.consume(token);
 assert.equal(result.requestedAccountId,A);
 assert.equal(result.requiresFreshServerMembershipCheck,true);
 assert.equal(result.selectionAuthorised,false);
 assert.equal(result.financialExecutionEnabled,false);
 assert.throws(()=>p.consume(token),/ACCOUNT_SELECTION_EXPIRED/);
});
test("stale, forged and invalidated selection intents fail closed",()=>{
 let clock=1000;const p=createAccountSelectionIntentPolicy({now:()=>clock,maxAgeMs:2000});
 const stale=p.issue({accountId:A});clock=3100;
 assert.throws(()=>p.consume(stale),/ACCOUNT_SELECTION_EXPIRED/);
 assert.throws(()=>p.consume({requestedAccountId:A}),/ACCOUNT_SELECTION_EXPIRED/);
 const fresh=p.issue({accountId:A});p.invalidate(fresh);
 assert.throws(()=>p.consume(fresh),/ACCOUNT_SELECTION_EXPIRED/);
 assert.throws(()=>p.issue({accountId:"bad"}),/ACCOUNT_SELECTION_INVALID/);
});
test("clock rollback, age misconfiguration and cross-policy reuse fail closed",()=>{
 assert.throws(()=>createAccountSelectionIntentPolicy({maxAgeMs:70_000}),TypeError);
 let clock=5000;const a=createAccountSelectionIntentPolicy({now:()=>clock});
 const b=createAccountSelectionIntentPolicy({now:()=>clock});
 const intent=a.issue({accountId:A});clock=4999;
 assert.throws(()=>a.consume(intent),/ACCOUNT_SELECTION_EXPIRED/);
 assert.throws(()=>b.consume(intent),/ACCOUNT_SELECTION_EXPIRED/);
});
