"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createAccountRequestLimiter} from "../http/account-request-limiter.mjs";
test("distinct trusted request identities have independent bounded quotas",async()=>{
 let clock=1000;
 const limiter=createAccountRequestLimiter({resolveTrustedClientKey:async r=>r.trustedKey,
  now:()=>clock,limit:2,windowMs:1000,maxKeys:2});
 assert.equal((await limiter.consume({trustedKey:"principal:A"})).allowed,true);
 assert.equal((await limiter.consume({trustedKey:"principal:A"})).allowed,true);
 const denied=await limiter.consume({trustedKey:"principal:A"});
 assert.equal(denied.allowed,false);
 assert.equal(denied.retryAfterMs,1000);
 assert.equal((await limiter.consume({trustedKey:"principal:B"})).allowed,true);
 clock=2000;
 assert.equal((await limiter.consume({trustedKey:"principal:A"})).allowed,true);
});
test("missing trusted key, invalid clock and exhausted state capacity fail closed",async()=>{
 const missing=createAccountRequestLimiter({resolveTrustedClientKey:async()=>""});
 await assert.rejects(()=>missing.consume({}),/ACCOUNT_RATE_IDENTITY_UNAVAILABLE/);
 const invalid=createAccountRequestLimiter({resolveTrustedClientKey:async()=>"valid",now:()=>NaN});
 await assert.rejects(()=>invalid.consume({}),/ACCOUNT_RATE_CLOCK_UNAVAILABLE/);
 const capped=createAccountRequestLimiter({resolveTrustedClientKey:async r=>r.key,maxKeys:1,limit:1});
 await capped.consume({key:"A"});
 await assert.rejects(()=>capped.consume({key:"B"}),/ACCOUNT_RATE_CAPACITY/);
});
test("configuration is bounded and no user input automatically selects trust key",()=>{
 assert.throws(()=>createAccountRequestLimiter({}),TypeError);
 assert.throws(()=>createAccountRequestLimiter({resolveTrustedClientKey:async()=>"a",limit:0}),TypeError);
 assert.throws(()=>createAccountRequestLimiter({resolveTrustedClientKey:async()=>"a",maxKeys:100001}),TypeError);
});
