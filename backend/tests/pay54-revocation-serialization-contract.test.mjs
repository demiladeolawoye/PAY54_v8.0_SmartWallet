"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessPay54SerializationTrace as assess,PAY54_SERIALIZATION_EVENTS as EVENTS} from "../governance/pay54-revocation-serialization-contract.mjs";
const sessionId="b4800000-0000-4000-8000-000000000001";
const accountId="b4800000-0000-4000-8000-000000000002";
const transactionId="b4800000-0000-4000-8000-000000000003";
const sample=()=>({
 environment:"DISPOSABLE_PG16",sessionId,accountId,transactionId,
 credentialDigest:"a".repeat(64),sessionVersion:4,
 lockKey:"session:"+sessionId,
 events:EVENTS.map((type,i)=>({type,order:i+1,transactionId})),
 revocationUsesSameLock:true,writerIsNonSuperuser:true,writerBypassRls:false,
 postMigrationRlsVerified:true,ledgerBalanced:true,outboxAtomic:true,
 replayAndRaceTestsPassed:true,revocationAfterCommitSemanticsDocumented:true
});
test("syntactically complete evidence is never execution authority",()=>{
 const r=assess(sample());
 assert.equal(r.inputComplete,true);
 assert.equal(r.status,"INDEPENDENT_DATABASE_REVIEW_REQUIRED");
 for(const k of ["traceAuthenticityEstablished","actualPostgresConcurrencyProven",
  "productionIdentityVerified","transactionExecutionAuthorised",
  "cloudProvisioningAuthorised","stagingAuthorised","productionAuthorised"])
  assert.equal(r[k],false);
 assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.findings));
});
test("reordered missing duplicate or foreign events fail closed",()=>{
 for(const change of [
  x=>x.events.reverse(),x=>x.events.pop(),
  x=>{x.events[2]={...x.events[1]};},
  x=>{x.events[4].transactionId=accountId;}
 ]){
  const x=sample();change(x);
  assert.ok(assess(x).findings.includes("TRANSACTION_EVENT_SEQUENCE_UNVERIFIED"));
 }
});
test("same-lock requirement, RLS, writer and invariants fail closed",()=>{
 for(const patch of [
  {revocationUsesSameLock:false},{writerIsNonSuperuser:false},
  {writerBypassRls:true},{postMigrationRlsVerified:false},
  {ledgerBalanced:false},{outboxAtomic:false},
  {replayAndRaceTestsPassed:false},
  {revocationAfterCommitSemanticsDocumented:false},
  {lockKey:"account:other"},{environment:"STAGING"}
 ])assert.equal(assess({...sample(),...patch}).inputComplete,false);
});
test("invalid identity and malformed evidence denied",()=>{
 assert.throws(()=>assess(null),/INVALID_SERIALIZATION_EVIDENCE/);
 assert.throws(()=>assess([]),/INVALID_SERIALIZATION_EVIDENCE/);
 assert.equal(assess({...sample(),sessionVersion:0}).inputComplete,false);
 assert.equal(assess({...sample(),credentialDigest:"bad"}).inputComplete,false);
});
