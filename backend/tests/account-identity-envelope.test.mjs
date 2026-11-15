"use strict";import test from "node:test";import assert from "node:assert/strict";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
import {createAccountIdentityEnvelope,requireAccountIdentityEnvelope}
 from "../security/account-identity-envelope.mjs";
const P="11111111-1111-4111-8111-111111111111",A="22222222-2222-4222-8222-222222222222";
test("trusted account envelope cannot be forged or mutated",async()=>{
 const resolver=createTrustedAccountPrincipalResolver({verifyServerSession:async()=>({
  subjectId:P,authenticated:true,revoked:false,expiresAt:Math.floor(Date.now()/1000)+60})});
 const principal=await resolver.resolve({});
 const v=createAccountIdentityEnvelope({principal,requestedAccountId:A});
 assert.equal(requireAccountIdentityEnvelope(v).accountId,A);
 assert.equal(v.financialExecutionEnabled,false);
 assert.ok(Object.isFrozen(v));
 assert.throws(()=>requireAccountIdentityEnvelope({...v}),/ACCOUNT_IDENTITY_DENIED/);
 assert.throws(()=>createAccountIdentityEnvelope({principal:{subjectId:P},requestedAccountId:A}),/ACCOUNT_AUTH_REQUIRED/);
});
