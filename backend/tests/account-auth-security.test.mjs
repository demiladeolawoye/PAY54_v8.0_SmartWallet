"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessAccountAuthSecurity,loadAccountAuthSources}
 from "../governance/account-auth-security.mjs";
test("source-only Ed25519 session, RLS and revocation checks remain fail closed",()=>{
 const result=assessAccountAuthSecurity(loadAccountAuthSources());
 assert.equal(result.passed,true,JSON.stringify(result.issues));
 assert.equal(result.runtimeVerified,false);
 assert.equal(result.financialExecution,"DISABLED");
 assert.equal(result.stagingRelease,"BLOCKED");
});
test("source mutations to RLS, signature verification and revocation are rejected",()=>{
 const source=loadAccountAuthSources();
 const changes=[
  {jws:source.jws.replace("verify(null,","fakeVerify(null,")},
  {jws:source.jws.replace("revocationGuard.check","noop.check")},
  {keys:source.keys.replace("ed25519","rsa")},
  {revocation:source.revocation.replace("revoked!==false","revoked===false")},
  {rls:source.rls.replace("USING (false)","USING (true)")},
  {adapter:source.adapter.replace("verifier.verifyCompactJws","verifier.skipVerification")}
 ];
 for(const change of changes){
   assert.equal(assessAccountAuthSecurity({...source,...change}).passed,false,
     Object.keys(change)[0]);
 }
});
test("missing trust material source fails",()=>{
 assert.throws(()=>assessAccountAuthSecurity({}),TypeError);
});
