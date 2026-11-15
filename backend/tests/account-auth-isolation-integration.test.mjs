"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,sign} from "node:crypto";
import {createAccountTrustKeyPolicy} from "../security/account-trust-key-policy.mjs";
import {createAccountRevocationGuard} from "../security/account-session-revocation.mjs";
import {createAccountJwsVerifier} from "../security/account-jws-verifier.mjs";
import {createAccountSignedSessionAdapter} from "../security/account-session-adapter.mjs";
import {createAccountReadBinding} from "../db/account-read-binding.mjs";
import {createAccountReadTransaction} from "../db/account-read-transaction.mjs";
import {assertAccountReadStatement} from "../db/account-sql-policy.mjs";
const P="11111111-1111-4111-8111-111111111111";
const Q="22222222-2222-4222-8222-222222222222";
const A="33333333-3333-4333-8333-333333333333";
const J="44444444-4444-4444-8444-444444444444";
const {publicKey,privateKey}=generateKeyPairSync("ed25519");
const policy=createAccountTrustKeyPolicy([{kid:"test-key",status:"ACTIVE",
 publicKeyPem:publicKey.export({format:"pem",type:"spki"})}]);
const b64=value=>Buffer.from(JSON.stringify(value)).toString("base64url");
function issue(subject){
 const now=Math.floor(Date.now()/1000);
 const message=b64({alg:"EdDSA",kid:"test-key",typ:"JWT"})+"."+
 b64({iss:"https://issuer.example",aud:"pay54-account",sub:subject,
   jti:J,iat:now-5,nbf:now-5,exp:now+90});
 return message+"."+sign(null,Buffer.from(message),privateKey).toString("base64url");
}
const verifier=createAccountJwsVerifier({trustPolicy:policy,
 revocationGuard:createAccountRevocationGuard({isRevoked:async()=>false}),
 issuer:"https://issuer.example",audience:"pay54-account"});
const identity=createAccountSignedSessionAdapter({extractSessionToken:async r=>r.signedSession,verifier});
test("different signed principals stay segregated in read-only canonical queries",async()=>{
 const observations=[];
 const pool={async connect(){return {
  async query(sql,params){
   if(sql.startsWith("SELECT"))observations.push({sql,params});
   return {rows:[]};
  },
  release(){ }
 };}};
 const tx=createAccountReadTransaction({pool,assertReadStatement:assertAccountReadStatement});
 const binding=createAccountReadBinding({principalResolver:identity,transaction:tx});
 const [first,second]=await Promise.all([
   binding.query({signedSession:issue(P)},"ACCOUNT_LIST"),
   binding.query({signedSession:issue(Q)},"ACCOUNT_SELECT",A)
 ]);
 assert.deepEqual(first.rows,[]);assert.deepEqual(second.rows,[]);
 assert.deepEqual(observations.map(x=>x.params),[[P],[Q,A]]);
});
test("forged session, unverified account key and tampered token deny before database access",async()=>{
 let calls=0;
 const binding=createAccountReadBinding({principalResolver:identity,
  transaction:{execute:async()=>{calls++;return {rows:[]};}}});
 const token=issue(P);
 const tampered=token.slice(0,-2)+"AA";
 for(const signedSession of [tampered,"bad",undefined]){
  await assert.rejects(()=>binding.query({signedSession},"ACCOUNT_LIST"),/SESSION_INVALID|ACCOUNT_AUTH_REQUIRED/);
 }
 assert.equal(calls,0);
});
