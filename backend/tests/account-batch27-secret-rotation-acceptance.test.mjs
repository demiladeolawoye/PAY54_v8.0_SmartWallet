"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54CredentialRotationEvidence as inspect}
 from "../governance/pay54-batch27-secret-rotation-acceptance.mjs";
const a={oldSecretFingerprint:"a".repeat(64),
 newSecretFingerprint:"b".repeat(64),oldRevokedAtMs:200,
 newActivatedAtMs:100,operatorApproved:true};
test("1161: two fingerprints cannot prove live secret manager rotation",()=>{
 const r=inspect(a);
 assert.equal(r.oldSecretClaimedRevoked,true);
 assert.equal(r.liveSecretManagerVersionIndependentlyVerified,false);
 assert.equal(r.credentialsExposedInReport,false);
});
test("1161: identical credentials and old rotation timing refused/flagged",()=>{
 assert.throws(()=>inspect({...a,newSecretFingerprint:a.oldSecretFingerprint}),
 /CREDENTIAL_ROTATION_REVIEW_DENIED/);
 assert.equal(inspect({...a,oldRevokedAtMs:50}).oldSecretClaimedRevoked,false);
});
