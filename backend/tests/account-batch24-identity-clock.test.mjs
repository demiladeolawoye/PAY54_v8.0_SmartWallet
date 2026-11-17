"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,sign} from "node:crypto";
import {createPay54IdentityAccessVerifier as make}
 from "../security/identity-access-verifier.mjs";
const key=generateKeyPairSync("ed25519"),kid="pay54-id-clock-001",now=1800000000000;
const issuer="https://identity.pay54.example",aud="pay54:session-issuer";
const base={
 iss:issuer,aud,sub:"11111111-1111-4111-8111-111111111111",
 jti:"99999999-9999-4999-8999-999999999999",
 iat:1800000000-10,nbf:1800000000-10,
 exp:1800000000+60,token_use:"access",scope:"pay54:session:issue"
};
const encode=x=>Buffer.from(JSON.stringify(x)).toString("base64url");
const signed=claims=>{
 const bytes=encode({alg:"EdDSA",typ:"at+jwt",kid})+"."+encode(claims);
 return bytes+"."+sign(null,Buffer.from(bytes),key.privateKey).toString("base64url");
};
const verifier=()=>make({trustedIssuer:issuer,expectedAudience:aud,
 trustedPublicKeys:{[kid]:key.publicKey.export({format:"pem",type:"spki"})},
 getTrustedServerTimeMs:()=>now});
test("949: time boundaries require active access assertion at exact server clock",()=>{
 assert.equal(verifier().verifyAccessToken(signed(base)).accountSessionCreated,false);
 for(const claims of [
  {...base,exp:1800000000},
  {...base,nbf:1800000001},
  {...base,iat:1800000031,nbf:1800000031,exp:1800000040},
  {...base,iat:-1},
  {...base,exp:base.iat+301}
 ])assert.throws(()=>verifier().verifyAccessToken(signed(claims)),
   /IDENTITY_ASSERTION_DENIED/);
});