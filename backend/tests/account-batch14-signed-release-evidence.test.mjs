"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,sign} from "node:crypto";
import {inspectPay54SignedReleaseReceipt} from "../governance/pay54-signed-release-evidence.mjs";

const {publicKey,privateKey}=generateKeyPairSync("ed25519");
const pem=publicKey.export({type:"spki",format:"pem"});
const claims=()=>({
 commitSha:"a".repeat(40),
 evidenceId:"PAY54-EV-REAL-REVIEW-0001",
 gate:"PAGES_ARTIFACT",
 reviewedAt:"2026-11-16T20:00:00.000Z",
 reviewer:"release-independent",
 signer:"security-owner",
 version:"pay54.release-evidence-receipt.v1"
});
const signed=input=>sign(null,Buffer.from(JSON.stringify(input),"utf8"),privateKey).toString("base64");
const assess=(c,sig,key=pem)=>inspectPay54SignedReleaseReceipt({
 claims:c,signatureBase64:sig,trustedPublicKeyPem:key,
 expectedCommitSha:"a".repeat(40),expectedSigner:"security-owner"
});
test("429: canonical Ed25519 receipt authenticates signed bytes but not operational acceptance",()=>{
 const c=claims(),r=assess(c,signed(c));
 assert.equal(r.signatureValid,true);
 assert.match(r.publicKeyFingerprint,/^[a-f0-9]{64}$/);
 assert.equal(r.releaseAuthorised,false);
 assert.equal(r.evidenceFactsIndependentlyVerified,false);
 assert.equal(r.trustedKeyProvenanceIndependentlyVerified,false);
 assert.equal(r.productionRelease,"BLOCKED");
});
test("429: alteration of signed evidence fields fails signature check",()=>{
 const c=claims(),signature=signed(c);
 const edited={...c,gate:"PAGES_SOURCE"};
 assert.equal(assess(edited,signature).signatureValid,false);
});
test("429: unknown signing key cannot impersonate independently trusted key",()=>{
 const c=claims(),{publicKey:other}=generateKeyPairSync("ed25519");
 assert.equal(assess(c,signed(c),other.export({type:"spki",format:"pem"})).signatureValid,false);
});
test("429: commit mismatch, signer mismatch and extra claim are blocked",()=>{
 const c=claims(),signature=signed(c);
 assert.throws(()=>inspectPay54SignedReleaseReceipt({
  claims:c,signatureBase64:signature,trustedPublicKeyPem:pem,
  expectedCommitSha:"b".repeat(40),expectedSigner:c.signer
 }),/COMMIT_MISMATCH/);
 assert.throws(()=>inspectPay54SignedReleaseReceipt({
  claims:c,signatureBase64:signature,trustedPublicKeyPem:pem,
  expectedCommitSha:c.commitSha,expectedSigner:"attacker"
 }),/SIGNER_MISMATCH/);
 assert.throws(()=>assess({...c,authorised:true},signature),/SCHEMA_DENIED/);
});
test("429: owner and independent reviewer cannot be the same identity",()=>{
 const c=claims();c.reviewer=c.signer;
 assert.throws(()=>assess(c,signed(c)),/IDENTITY_DENIED/);
});
