"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,sign} from "node:crypto";
import {PAY54_RELEASE_GATES} from "../governance/pay54-release-evidence-review.mjs";
import {reviewPay54ReleaseEvidencePacket}
 from "../governance/pay54-release-evidence-packet-review.mjs";

const COMMIT="c".repeat(40);
const KEY=generateKeyPairSync("ed25519");
const registry={"security-owner":KEY.publicKey.export({type:"spki",format:"pem"})};
function fixture(){
 const evidence=[],receipts=[];
 PAY54_RELEASE_GATES.forEach((gate,i)=>{
  const claims={
   commitSha:COMMIT,evidenceId:"PAY54-EV-GATE-"+String(i).padStart(3,"0"),
   gate,reviewedAt:"2026-11-16T20:00:00.000Z",
   reviewer:"independent-reviewer",signer:"security-owner",
   version:"pay54.release-evidence-receipt.v1"
  };
  evidence.push({gate,commitSha:COMMIT,evidenceId:claims.evidenceId,
   reviewedAt:claims.reviewedAt,reviewer:claims.reviewer,
   owner:claims.signer,decision:"PASS"});
  receipts.push({claims,signatureBase64:sign(null,
   Buffer.from(JSON.stringify(claims)),KEY.privateKey).toString("base64")});
 });
 return {commitSha:COMMIT,evidence,receipts,trustedKeys:registry,
  reviewTime:"2026-11-16T21:00:00.000Z"};
}
test("443: structurally consistent signed packet cannot authorise release",()=>{
 const report=reviewPay54ReleaseEvidencePacket(fixture());
 assert.equal(report.cryptographicallyAndStructurallyConsistent,true);
 assert.equal(report.crossChecks.length,0);
 assert.equal(report.underlyingFactsVerified,false);
 assert.equal(report.trustedRegistryOperationallyAttested,false);
 assert.equal(report.releaseAuthorised,false);
 assert.equal(report.productionRelease,"BLOCKED");
});
test("443: changing metadata to disagree with signed receipt fails closed",()=>{
 const f=fixture();f.evidence[0].owner="unknown-reviewer";
 const report=reviewPay54ReleaseEvidencePacket(f);
 assert.equal(report.cryptographicallyAndStructurallyConsistent,false);
 assert.equal(report.crossChecks[0].reason,"SIGNED_METADATA_MISMATCH");
});
test("443: missing gate and altered signed claims fail closed",()=>{
 const f=fixture();f.receipts.pop();
 assert.equal(reviewPay54ReleaseEvidencePacket(f).cryptographicallyAndStructurallyConsistent,false);
 const forged=fixture();
 forged.receipts[0].claims={...forged.receipts[0].claims,gate:"PAGES_SOURCE",evidenceId:"PAY54-EV-MODIFIED"};
 assert.equal(reviewPay54ReleaseEvidencePacket(forged).cryptographicallyAndStructurallyConsistent,false);
});
test("443: review clock cannot be omitted",()=>{
 const f=fixture();delete f.reviewTime;
 assert.throws(()=>reviewPay54ReleaseEvidencePacket(f),/REVIEW_TIME_REQUIRED/);
});
