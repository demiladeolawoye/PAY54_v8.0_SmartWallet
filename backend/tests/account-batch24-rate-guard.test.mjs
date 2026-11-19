"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { createPay54BootstrapRateGuard as guard }
 from "../security/identity-rate-guard.mjs";
const input={
 trustedRequestHmac:"a".repeat(64),
 correlationId:"77777777-7777-4777-8777-777777777777"
};
test("947: a true distributed atomic limiter is required before authentication",async()=>{
 let called=0;
 const limiter=guard({consumeAtomicAttempt:async options=>{
  called++;
  assert.equal(options.operation,"identity-bootstrap");
  assert.equal(options.maxAttempts,5);
  assert.equal(options.windowSeconds,60);
  assert.equal(options.key,input.trustedRequestHmac);
  return {enforcedBy:"distributed-atomic-store",allowed:true,remaining:3};
 }});
 const result=await limiter.admit(input);
 assert.equal(called,1);
 assert.equal(result.customerIdentityVerified,false);
 assert.equal(result.accountSessionCreated,false);
});
test("947: missing, non-atomic, permissive or failed limiter denies instead of falling back",async()=>{
 for(const service of [
  async()=>{throw Error("private-limiter-store");},
  async()=>({allowed:true,enforcedBy:"memory",remaining:3}),
  async()=>({allowed:false,enforcedBy:"distributed-atomic-store",remaining:0}),
  async()=>({allowed:true,enforcedBy:"distributed-atomic-store",remaining:99})
 ])await assert.rejects(guard({consumeAtomicAttempt:service}).admit(input),
  /BOOTSTRAP_RATE_LIMIT_UNAVAILABLE/);
 assert.throws(()=>guard(),/BOOTSTRAP_RATE_LIMIT_UNAVAILABLE/);
});
test("947: raw IP, attacker-supplied key and malformed HMAC are denied",async()=>{
 const limiter=guard({consumeAtomicAttempt:async()=>({allowed:true,
  enforcedBy:"distributed-atomic-store",remaining:3})});
 for(const key of ["192.168.1.1","a".repeat(63),"A".repeat(64),null]){
  await assert.rejects(limiter.admit({...input,trustedRequestHmac:key}),
   /BOOTSTRAP_RATE_LIMIT_UNAVAILABLE/);
 }
});
