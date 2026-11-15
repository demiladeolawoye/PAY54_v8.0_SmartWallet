"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,sign} from "node:crypto";
import {createAccountTrustKeyPolicy} from "../security/account-trust-key-policy.mjs";
import {createAccountRevocationGuard} from "../security/account-session-revocation.mjs";
import {createAccountJwsVerifier} from "../security/account-jws-verifier.mjs";
const S="11111111-1111-4111-8111-111111111111",J="22222222-2222-4222-8222-222222222222";
const {publicKey,privateKey}=generateKeyPairSync("ed25519");
const trustPolicy=createAccountTrustKeyPolicy([{kid:"key_1",status:"ACTIVE",publicKeyPem:publicKey.export({type:"spki",format:"pem"})}]);
const now=Math.floor(Date.now()/1000);
const payload={iss:"https://issuer.example",aud:"pay54-account",sub:S,jti:J,iat:now-10,nbf:now-10,exp:now+120};
const header={alg:"EdDSA",kid:"key_1",typ:"JWT"};
const enc=data=>Buffer.from(JSON.stringify(data)).toString("base64url");
const signed=(h=header,p=payload,key=privateKey)=>{
 const input=enc(h)+"."+enc(p);return input+"."+sign(null,Buffer.from(input),key).toString("base64url");
};
const verifier=createAccountJwsVerifier({trustPolicy,
 revocationGuard:createAccountRevocationGuard({isRevoked:async()=>false}),
 issuer:payload.iss,audience:payload.aud});
test("pinned Ed25519 signature, issuer, audience and short lifetime verify",async()=>{
 const result=await verifier.verifyCompactJws(signed());
 assert.equal(result.subjectId,S);
 assert.equal(result.authenticated,true);assert.equal(result.revoked,false);
 assert.ok(Object.isFrozen(result));
});
test("tampered, algorithm-confused, stale and wrong-audience tokens fail closed",async()=>{
 const other=generateKeyPairSync("ed25519");
 const bad=[
   signed(header,{...payload,aud:"other"}),
   signed(header,{...payload,exp:now-1}),
   signed(header,{...payload,exp:now+3600}),
   signed({...header,alg:"none"}),
   signed({...header,kid:"key_missing"}),
   signed(header,payload,other.privateKey),
   signed()+"junk",
   "not-a-signed-token",
   signed().split(".").slice(0,2).join(".")
 ];
 for(const token of bad)await assert.rejects(()=>verifier.verifyCompactJws(token),/SESSION_INVALID/);
});
test("revocation failures and positive revocations deny signed sessions",async()=>{
 for(const isRevoked of [async()=>true,async()=>{throw Error("offline");}]){
  const v=createAccountJwsVerifier({trustPolicy,issuer:payload.iss,audience:payload.aud,
    revocationGuard:createAccountRevocationGuard({isRevoked})});
  await assert.rejects(()=>v.verifyCompactJws(signed()),/SESSION_REVOKED_OR_EXPIRED|REVOCATION_UNAVAILABLE/);
 }
});
