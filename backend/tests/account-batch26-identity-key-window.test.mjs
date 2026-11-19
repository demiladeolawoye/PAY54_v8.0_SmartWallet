"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54IdentityKeyWindow as inspect}
 from "../governance/pay54-batch26-identity-key-window.mjs";
const now=1800000000000;
const keys=["pay54-old-key","pay54-new-key"].map(kid=>({
 kid,validFromMs:now-1000,validUntilMs:now+100000,
 privateKeyPresent:false
}));
test("1038: overlapping public signing keys are not live IdP proof",()=>{
 const r=inspect({keys,nowMs:now,activeKid:"pay54-new-key"});
 assert.equal(r.dualKeyOverlapInSource,true);
 assert.equal(r.idpRevocationPropagationVerified,false);
 assert.equal(r.productionReleaseAuthorised,false);
});
test("1038: duplicate, expired and private key ingress denied",()=>{
 for(const bad of [
  [...keys,keys[0]],
  keys.map((x,i)=>i===0?{...x,privateKeyPresent:true}:x),
  keys.map(x=>({...x,validUntilMs:now-1}))
 ])assert.throws(()=>inspect({keys:bad,nowMs:now,
  activeKid:"pay54-new-key"}),/IDENTITY_KEY_WINDOW_DENIED/);
});
