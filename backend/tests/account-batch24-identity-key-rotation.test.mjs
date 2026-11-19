"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,sign} from "node:crypto";
import {createPay54IdentityAccessVerifier as make}
 from "../security/identity-access-verifier.mjs";

const now=1800000000000,issuer="https://identity.pay54.example",aud="pay54:session-issuer";
const old=generateKeyPairSync("ed25519"),next=generateKeyPairSync("ed25519");
const claims={
 iss:issuer,aud,sub:"11111111-1111-4111-8111-111111111111",
 jti:"99999999-9999-4999-8999-999999999999",
 iat:1800000000-20,nbf:1800000000-20,
 exp:1800000000+90,token_use:"access",scope:"pay54:session:issue"
};
const b64=value=>Buffer.from(JSON.stringify(value)).toString("base64url");
const jwt=(kid,privateKey)=>{
 const text=b64({alg:"EdDSA",typ:"at+jwt",kid})+"."+b64(claims);
 return text+"."+sign(null,Buffer.from(text),privateKey).toString("base64url");
};
const keys={
 "pay54-auth-old-001":old.publicKey.export({format:"pem",type:"spki"}),
 "pay54-auth-next-002":next.publicKey.export({format:"pem",type:"spki"})
};
const verifier=keysValue=>make({trustedIssuer:issuer,expectedAudience:aud,
 trustedPublicKeys:keysValue,getTrustedServerTimeMs:()=>now});
test("948: overlapping trusted Ed25519 keys verify independently during planned rotation",()=>{
 assert.equal(verifier(keys).verifyAccessToken(jwt("pay54-auth-old-001",old.privateKey))
  .principalId,claims.sub);
 assert.equal(verifier(keys).verifyAccessToken(jwt("pay54-auth-next-002",next.privateKey))
  .principalId,claims.sub);
});
test("948: retired and unrelated keys cannot authenticate",()=>{
 assert.throws(()=>verifier({"pay54-auth-next-002":keys["pay54-auth-next-002"]})
  .verifyAccessToken(jwt("pay54-auth-old-001",old.privateKey)),
  /IDENTITY_ASSERTION_DENIED/);
 assert.throws(()=>verifier(keys).verifyAccessToken(
  jwt("pay54-auth-old-001",next.privateKey)),/IDENTITY_ASSERTION_DENIED/);
});