"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync} from "node:crypto";
import {inspectPay54IdentityTrustProvenance as inspect}
 from "../governance/pay54-batch27-identity-trust-provenance.mjs";
const pair=generateKeyPairSync("ed25519");
const x={issuer:"https://identity.pay54.example",
 expectedAudience:"pay54:session-issuer",keyId:"pay54-key-001",
 publicKeyPem:pair.publicKey.export({format:"pem",type:"spki"})};
test("1139: public trust SPKI fingerprint does not prove provider owns key",()=>{
 const r=inspect(x);
 assert.equal(r.publicKeySpkiSha256.length,64);
 assert.equal(r.signingPrivateKeyIncluded,false);
 assert.equal(r.identityProviderKeyOwnershipIndependentlyVerified,false);
});
test("1139: private PEM and unrelated audience rejected",()=>{
 assert.throws(()=>inspect({...x,publicKeyPem:pair.privateKey.export({
  format:"pem",type:"pkcs8"})}),/IDENTITY_TRUST_PROVENANCE_DENIED/);
 assert.throws(()=>inspect({...x,expectedAudience:"PAY54-public-app"}),
  /IDENTITY_TRUST_PROVENANCE_DENIED/);
});
