"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync} from "node:crypto";
import {loadPay54StagingIdentityTrust as load}
 from "../security/identity-staging-trust.mjs";
const keys=generateKeyPairSync("ed25519");
const pem=keys.publicKey.export({format:"pem",type:"spki"});
const env={
 PAY54_ENV:"staging",PAY54_REAL_MONEY_MODE:"false",
 PAY54_STAGING_IDENTITY_TRUST_ENABLED:"true",
 PAY54_STAGING_IDENTITY_ISSUER:"https://identity.pay54.example",
 PAY54_STAGING_IDENTITY_AUDIENCE:"pay54:session-issuer",
 PAY54_STAGING_IDENTITY_KEYS_JSON:JSON.stringify({
  "pay54-staging-key-001":pem
 })
};
test("958: staging trust contains only public keys, never a connected IdP",()=>{
 const config=load(env);
 assert.equal(config.trustedIssuer,"https://identity.pay54.example");
 assert.equal(config.identityProviderConnected,false);
 assert.equal(config.customerLoginEnabled,false);
 assert.equal(config.deploymentAuthorised,false);
 assert.ok(Object.isFrozen(config.trustedPublicKeys));
});
test("958: production, private key, missing key and remote JWKS trust are refused",()=>{
 for(const mutation of [
  {PAY54_ENV:"production"},
  {PAY54_REAL_MONEY_MODE:"true"},
  {PAY54_STAGING_IDENTITY_TRUST_ENABLED:"false"},
  {PAY54_STAGING_IDENTITY_ISSUER:"http://identity.pay54.example"},
  {PAY54_STAGING_IDENTITY_ISSUER:"https://identity.pay54.example/tenant"},
  {PAY54_STAGING_IDENTITY_KEYS_JSON:JSON.stringify({
   "pay54-staging-key-001":"-----BEGIN PRIVATE KEY-----..."
  })},
  {PAY54_STAGING_IDENTITY_KEYS_JSON:"{}"},
  {PAY54_STAGING_IDENTITY_KEYS_JSON:'{"jku":"https://evil.example"}'}
 ])assert.throws(()=>load({...env,...mutation}),
  /STAGING_IDENTITY_TRUST_DENIED/);
});
