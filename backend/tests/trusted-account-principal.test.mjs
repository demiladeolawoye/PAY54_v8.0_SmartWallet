"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { createTrustedAccountPrincipalResolver, requireTrustedPrincipal } from "../domain/trusted-account-principal.mjs";
const ID = "11111111-1111-4111-8111-111111111111";
const session = overrides => ({
  subjectId: ID, authenticated: true, revoked: false,
  expiresAt: Math.floor(Date.now() / 1000) + 3600, ...overrides
});
test("trusted principal requires a server verifier",()=>{
  assert.throws(()=>createTrustedAccountPrincipalResolver({}),TypeError);
});
test("valid authenticated unrevoked session produces opaque verified identity",async()=>{
  const r=createTrustedAccountPrincipalResolver({ verifyServerSession: async()=>session() });
  const p=await r.resolve({headers: {"x-account-id":"attacker"}});
  assert.equal(requireTrustedPrincipal(p),ID);
  assert.ok(Object.isFrozen(p));
  assert.deepEqual(Object.keys(p),["subjectId"]);
});
test("untrusted identity-shaped objects do not qualify",()=>{
  assert.throws(()=>requireTrustedPrincipal({subjectId:ID}),/ACCOUNT_AUTH_REQUIRED/);
  assert.throws(()=>requireTrustedPrincipal(null),/ACCOUNT_AUTH_REQUIRED/);
});
test("expired, revoked, unverified and malformed sessions fail closed", async()=>{
  const invalid=[
    session({revoked:true}),session({authenticated:false}),
    session({expiresAt:0}),session({subjectId:"not-a-uuid"}),
    session({expiresAt:"tomorrow"}),null
  ];
  for(const value of invalid) {
    const r=createTrustedAccountPrincipalResolver({verifyServerSession:async()=>value});
    await assert.rejects(()=>r.resolve({}),/ACCOUNT_AUTH_REQUIRED/);
  }
});
test("verifier failures propagate without fallback to request identity",async()=>{
  const r=createTrustedAccountPrincipalResolver({verifyServerSession:async()=>{throw Error("session-unavailable")}});
  await assert.rejects(()=>r.resolve({principalId:ID}),/session-unavailable/);
});
