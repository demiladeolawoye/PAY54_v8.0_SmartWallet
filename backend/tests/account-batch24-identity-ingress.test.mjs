"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { parsePay54SessionIssuanceRequest as parse }
 from "../security/identity-ingress.mjs";
const valid={
 requestPayload:{accessAssertion:"A".repeat(45)+"."+"B".repeat(80)+"."+"C".repeat(86)},
 requestOrigin:"https://wallet.example",
 trustedApplicationOrigin:"https://wallet.example"
};
test("921: origin-bound access assertion remains unauthenticated",()=>{
 const result=parse(valid);
 assert.equal(result.accessAssertion,valid.requestPayload.accessAssertion);
 assert.equal(result.sessionIssued,false);
 assert.equal(result.identitySignatureVerificationRequired,true);
 assert.ok(Object.isFrozen(result));
});
test("921: browser-supplied actor, claims, origin and malformed requests fail closed",()=>{
 for(const mutation of [
  {requestPayload:{...valid.requestPayload,role:"OWNER"}},
  {requestPayload:{...valid.requestPayload,principalId:"actor"}},
  {requestPayload:{...valid.requestPayload,accountId:"business"}},
  {requestPayload:[]},{requestPayload:null},
  {requestPayload:{accessAssertion:"bad"}},
  {requestOrigin:"https://attacker.example"},
  {requestOrigin:"https://wallet.example.evil"},
  {trustedApplicationOrigin:"http://wallet.example"},
  {trustedApplicationOrigin:"https://wallet.example/path"}
 ])assert.throws(()=>parse({...valid,...mutation}),/IDENTITY_INGRESS_DENIED/);
});
