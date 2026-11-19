"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { createPay54IdentityAccessVerifier }
  from "../security/identity-access-verifier.mjs";

const now=1800000000000;
const issuer="https://identity.pay54.example";
const aud="pay54:session-issuer";
const kid="pay54-test-ed25519-001";
const pair=generateKeyPairSync("ed25519");
const attacker=generateKeyPairSync("ed25519");
const claims={
  iss:issuer,aud,sub:"11111111-1111-4111-8111-111111111111",
  jti:"22222222-2222-4222-8222-222222222222",
  iat:Math.floor(now/1000)-15,nbf:Math.floor(now/1000)-15,
  exp:Math.floor(now/1000)+60,token_use:"access",
  scope:"pay54:session:issue"
};
const b64=value=>Buffer.from(JSON.stringify(value)).toString("base64url");
function token(payload=claims,key=pair.privateKey,header={
  alg:"EdDSA",typ:"at+jwt",kid
}) {
  const input=b64(header)+"."+b64(payload);
  return input+"."+sign(null,Buffer.from(input),key).toString("base64url");
}
const trustedPublicKeys={
  [kid]:pair.publicKey.export({format:"pem",type:"spki"})
};
const make=()=>createPay54IdentityAccessVerifier({
  trustedIssuer:issuer,expectedAudience:aud,
  trustedPublicKeys,getTrustedServerTimeMs:()=>now
});

test("919: verified short-lived access token returns only principal and one-time jti",()=>{
  const value=make().verifyAccessToken(token());
  assert.equal(value.principalId,claims.sub);
  assert.equal(value.assertionId,claims.jti);
  assert.equal(value.cryptographicSignatureVerified,true);
  assert.equal(value.accountSessionCreated,false);
  assert.equal(value.moneyOperationAuthorised,false);
  assert.ok(Object.isFrozen(value));
});

test("919: header confusion, forged signature, wrong issuer and account-role smuggling reject",()=>{
  for(const credential of [
    token({...claims,iss:"https://evil.example"}),
    token({...claims,aud:"pay54:untrusted"}),
    token({...claims,token_use:"id"}),
    token({...claims,scope:"pay54:session:issue pay54:payments"}),
    token({...claims,role:"BUSINESS_OWNER"}),
    token({...claims,sub:"not-a-uuid"}),
    token({...claims,exp:Math.floor(now/1000)}),
    token({...claims,nbf:Math.floor(now/1000)+1}),
    token({...claims,exp:claims.iat+301}),
    token(claims,attacker.privateKey),
    token(claims,pair.privateKey,{alg:"none",typ:"at+jwt",kid}),
    token(claims,pair.privateKey,{alg:"EdDSA",typ:"JWT",kid}),
    token(claims,pair.privateKey,{alg:"EdDSA",typ:"at+jwt",kid,jku:"https://evil.example"}),
    "bad.token.signature"
  ]) assert.throws(()=>make().verifyAccessToken(credential),
    /IDENTITY_ASSERTION_DENIED/);
});

test("919: trust root and algorithm must be server supplied",()=>{
  assert.throws(()=>createPay54IdentityAccessVerifier({
    trustedIssuer:"http://identity.example",
    expectedAudience:aud,trustedPublicKeys
  }),/IDENTITY_ASSERTION_DENIED/);
  assert.throws(()=>createPay54IdentityAccessVerifier({
    trustedIssuer:issuer,expectedAudience:aud,trustedPublicKeys:{}
  }),/IDENTITY_ASSERTION_DENIED/);
});
