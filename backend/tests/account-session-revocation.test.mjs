"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createAccountRevocationGuard} from "../security/account-session-revocation.mjs";
const subjectId="11111111-1111-4111-8111-111111111111";
const jti="22222222-2222-4222-8222-222222222222";
const claim={jti,subjectId,expiresAt:2000};
test("explicit false from trusted revocation repository permits session check only",async()=>{
 const guard=createAccountRevocationGuard({isRevoked:async value=>{
  assert.deepEqual(value,claim);return false;},now:()=>1000*1000});
 assert.equal(await guard.check(claim),true);
});
test("unknown status, stale token or down revocation store fail closed",async()=>{
 for(const v of [true,undefined,null]){
  const guard=createAccountRevocationGuard({isRevoked:async()=>v,now:()=>1000*1000});
  await assert.rejects(()=>guard.check(claim),/SESSION_REVOKED_OR_EXPIRED/);
 }
 const down=createAccountRevocationGuard({isRevoked:async()=>{throw Error("network");},now:()=>1000*1000});
 await assert.rejects(()=>down.check(claim),/REVOCATION_UNAVAILABLE/);
 const expired=createAccountRevocationGuard({isRevoked:async()=>false,now:()=>2000*1000});
 await assert.rejects(()=>expired.check(claim),/SESSION_REVOKED_OR_EXPIRED/);
});
test("missing backend and invalid token identifiers fail",async()=>{
 assert.throws(()=>createAccountRevocationGuard(),TypeError);
 const guard=createAccountRevocationGuard({isRevoked:async()=>false,now:()=>1000*1000});
 await assert.rejects(()=>guard.check({...claim,jti:"bad"}),/SESSION_REVOKED_OR_EXPIRED/);
});
