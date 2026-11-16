"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,sign} from "node:crypto";
import {PAY54_RELEASE_GATES} from "../governance/pay54-release-evidence-review.mjs";
import {assessPay54SignedReleaseBundle}
 from "../governance/pay54-signed-release-bundle.mjs";

const COMMIT="b".repeat(40);
const {publicKey,privateKey}=generateKeyPairSync("ed25519");
const pem=publicKey.export({type:"spki",format:"pem"});
function records(){
 return PAY54_RELEASE_GATES.map((gate,i)=>{
  const claims={
   commitSha:COMMIT,evidenceId:"PAY54-EV-GATE-"+i,
   gate,reviewedAt:"2026-11-16T20:00:00.000Z",
   reviewer:"independent-reviewer",signer:"security-owner",
   version:"pay54.release-evidence-receipt.v1"
  };
  const signatureBase64=sign(null,Buffer.from(JSON.stringify(claims)),privateKey)
   .toString("base64");
  return {claims,signatureBase64};
 });
}
const assess=(receipts,keys={"security-owner":pem})=>assessPay54SignedReleaseBundle({
 commitSha:COMMIT,receipts,trustedKeys:keys
});

test("432: all signed gate receipts still cannot authorise a release",()=>{
 const result=assess(records());
 assert.equal(result.signaturesValidAndComplete,true);
 assert.equal(result.requiredGateCount,9);
 assert.equal(result.registryProvenanceVerified,false);
 assert.equal(result.operationalEvidenceVerified,false);
 assert.equal(result.releaseAuthorised,false);
 assert.equal(result.productionRelease,"BLOCKED");
});
test("432: one missing gate refuses a complete attestation",()=>{
 const r=assess(records().slice(1));
 assert.equal(r.signaturesValidAndComplete,false);
 assert.ok(r.failures.some(x=>x.reason==="MISSING_RECEIPT"));
});
test("432: duplicated gate and tampered gate fail closed",()=>{
 const input=records();
 assert.ok(assess([...input,input[0]]).failures.some(x=>x.reason==="DUPLICATE_RECEIPT"));
 const edited=records();
 edited[0].claims={...edited[0].claims,evidenceId:"PAY54-EV-FORGED"};
 assert.ok(assess(edited).failures.some(x=>x.reason==="INVALID_SIGNATURE"));
});
test("432: missing trusted signer key denies bundle integrity",()=>{
 const r=assess(records(),{});
 assert.equal(r.signaturesValidAndComplete,false);
 assert.ok(r.failures.some(x=>x.reason==="TRUSTED_KEY_NOT_CONFIGURED"));
});
test("432: signer for an unknown release gate cannot be accepted",()=>{
 const input=records();
 input[0].claims={...input[0].claims,gate:"UNKNOWN_GATE"};
 const r=assess(input);
 assert.ok(r.failures.some(x=>x.reason==="UNSUPPORTED_GATE"));
 assert.ok(r.failures.some(x=>x.reason==="MISSING_RECEIPT"));
});
