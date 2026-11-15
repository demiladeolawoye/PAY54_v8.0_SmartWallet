"use strict";
import test from "node:test";import assert from "node:assert/strict";
import {createAccountRevocationFreshness} from "../security/account-revocation-freshness.mjs";
const S={subjectId:"11111111-1111-4111-8111-111111111111"};
test("fresh authoritative nonrevocation is advisory, never financial authorisation",async()=>{
 const gate=createAccountRevocationFreshness({checkAuthoritative:async()=>false,now:()=>1000});
 const v=await gate.assertFresh(S);assert.equal(v.current,true);assert.equal(v.transactionAuthorised,false);
});
test("store outage, stale latency, revoked or unknown status fail",async()=>{
 for(const input of [
  {checkAuthoritative:async()=>true,now:()=>1000},
  {checkAuthoritative:async()=>undefined,now:()=>1000},
  {checkAuthoritative:async()=>{throw Error("down")},now:()=>1000},
  {checkAuthoritative:async()=>false,now:(()=>{let i=0;return ()=>i++===0?1000:5000})()}
 ])await assert.rejects(()=>createAccountRevocationFreshness(input).assertFresh(S),/REVOCATION_UNAVAILABLE|SESSION_REVOKED/);
});
