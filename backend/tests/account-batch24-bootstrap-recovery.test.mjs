"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { assessPay54BootstrapRecovery as assess }
 from "../security/session-bootstrap-recovery.mjs";
const identity={
 schema:"pay54.verified-identity-access.v1",
 cryptographicSignatureVerified:true,
 principalId:"11111111-1111-4111-8111-111111111111",
 assertionId:"99999999-9999-4999-8999-999999999999",
 issuer:"https://identity.pay54.example"
};
const receipt={
 assertionId:identity.assertionId,
 issuer:identity.issuer,
 principalId:identity.principalId,
 bootstrapSessionId:"aaaaaaaa-0000-4000-8000-000000000001",
 privateDigest:"never-return"
};
test("941: committed replay receipt leads only to fresh signed reauthentication",async()=>{
 const r=await assess({
  verifiedIdentity:identity,
  readReceiptFromTrustedStore:async()=>({...receipt}),
  getTrustedServerTimeMs:()=>1800000000000
 });
 assert.equal(r.assertionConsumed,true);
 assert.equal(r.automaticBootstrapRetryAuthorised,false);
 assert.equal(r.recoveryAction,"REAUTHENTICATE_WITH_NEW_SIGNED_ASSERTION");
 assert.equal(JSON.stringify(r).includes("never-return"),false);
 assert.equal(r.moneyMovementAuthorised,false);
 assert.ok(Object.isFrozen(r));
});
test("941: unknown receipt still forbids automatic replay of stale identity proof",async()=>{
 const r=await assess({
  verifiedIdentity:identity,
  readReceiptFromTrustedStore:async()=>null,
  getTrustedServerTimeMs:()=>1800000000000
 });
 assert.equal(r.assertionConsumed,false);
 assert.equal(r.automaticBootstrapRetryAuthorised,false);
});
test("941: mismatched actor, unknown DB state or unverified assertion deny",async()=>{
 for(const bad of [
  {readReceiptFromTrustedStore:async()=>({...receipt,principalId:identity.assertionId})},
  {readReceiptFromTrustedStore:async()=>{throw Error("db-private-host");}},
  {verifiedIdentity:{...identity,cryptographicSignatureVerified:false}},
  {getTrustedServerTimeMs:()=>Number.NaN}
 ])await assert.rejects(assess({
  verifiedIdentity:identity,
  readReceiptFromTrustedStore:async()=>receipt,
  getTrustedServerTimeMs:()=>1800000000000,...bad
 }),/ASSERTION_RECOVERY_DENIED/);
});
