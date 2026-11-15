"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createAccountSignedSessionAdapter} from "../security/account-session-adapter.mjs";
import {requireTrustedPrincipal} from "../domain/trusted-account-principal.mjs";
const subjectId="11111111-1111-4111-8111-111111111111";
test("verified compact-session adapter produces opaque trusted principal",async()=>{
 let calls=0;
 const adapter=createAccountSignedSessionAdapter({
  extractSessionToken:async r=>r.serverSession,
  verifier:{verifyCompactJws:async token=>{
   calls++;assert.equal(token,"a".repeat(25));
   return {subjectId,authenticated:true,revoked:false,
     expiresAt:Math.floor(Date.now()/1000)+120};
  }}
 });
 const principal=await adapter.resolve({serverSession:"a".repeat(25),body:{subjectId:"forged"}});
 assert.equal(requireTrustedPrincipal(principal),subjectId);
 assert.equal(calls,1);
});
test("missing token, verifier rejection and untrusted identity cannot authenticate",async()=>{
 const adapter=createAccountSignedSessionAdapter({
  extractSessionToken:async r=>r.serverSession,
  verifier:{verifyCompactJws:async()=>{throw Error("SESSION_INVALID");}}
 });
 await assert.rejects(()=>adapter.resolve({body:{subjectId}}),/ACCOUNT_AUTH_REQUIRED/);
 await assert.rejects(()=>adapter.resolve({serverSession:"a".repeat(25)}),/SESSION_INVALID/);
 assert.throws(()=>createAccountSignedSessionAdapter({}),TypeError);
});
