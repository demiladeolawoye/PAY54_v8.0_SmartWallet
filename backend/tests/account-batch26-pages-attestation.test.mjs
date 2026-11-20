"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,sign} from "node:crypto";
import {encodePay54PagesAttestation as encode,
 verifyPay54PagesAttestation as verify}
 from "../governance/pay54-batch26-pages-attestation.mjs";
const pair=generateKeyPairSync("ed25519"),foreign=generateKeyPairSync("ed25519");
const now=1800000000000;
const statement={commitSha:"a".repeat(40),artifactSha256:"b".repeat(64),
 reviewerId:"security-reviewer",signedAtMs:now,decision:"REVIEW_REQUIRED"};
const sig=sign(null,encode(statement),pair.privateKey).toString("base64url");
const args={statement,signature:sig,trustedReviewerPublicKey:pair.publicKey,
 expectedCommitSha:statement.commitSha,trustedNowMs:now};
test("1026: signed Pages reviewer statement is not independent proof of public state",()=>{
 const r=verify(args);
 assert.equal(r.signatureVerified,true);
 assert.equal(r.publicPagesContainmentProven,false);
 assert.equal(r.productionDeploymentAuthorised,false);
});
test("1026: forged author, stale statement, wrong SHA or modified conclusion denied",()=>{
 for(const v of [
  {trustedReviewerPublicKey:foreign.publicKey},
  {trustedReviewerPublicKey:pair.privateKey},
  {trustedReviewerPublicKey:pair.privateKey.export({format:"pem",type:"pkcs8"})},
  {expectedCommitSha:"c".repeat(40)},
  {trustedNowMs:now+86400001},
  {statement:{...statement,decision:"NO_SOURCE_MATCH"}},
  {signature:"A".repeat(86)}
 ])assert.throws(()=>verify({...args,...v}),/PAGES_ATTESTATION_DENIED/);
});
