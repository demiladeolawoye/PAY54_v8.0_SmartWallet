"use strict";

/**
 * PAY54 Batch 14 item 431 — cross-gate cryptographic receipt assessment.
 *
 * A trusted public-key registry is supplied separately from the receipts.
 * This source-only assessor checks Ed25519 signature validity, exact evidence
 * identity, gate binding and source commit. It never proves actual operational
 * approval or activates a release.
 */
import {PAY54_RELEASE_GATES} from "./pay54-release-evidence-review.mjs";
import {inspectPay54SignedReleaseReceipt}
 from "./pay54-signed-release-evidence.mjs";

const SHA=/^[0-9a-f]{40}$/;
export function assessPay54SignedReleaseBundle({
 commitSha,receipts,trustedKeys
}={}){
 if(!SHA.test(commitSha??"")){
  throw new Error("PAY54_SIGNED_BUNDLE_COMMIT_REQUIRED");
 }
 if(!Array.isArray(receipts)||receipts.length>100||!trustedKeys||
  typeof trustedKeys!=="object"||Array.isArray(trustedKeys)){
  throw new TypeError("PAY54_SIGNED_BUNDLE_INPUT_INVALID");
 }
 const failures=[];
 const seen=new Set();
 const evidenceIds=new Set();
 for(const receipt of receipts){
  const gate=receipt?.claims?.gate;
  if(!PAY54_RELEASE_GATES.includes(gate)){
   failures.push({gate:"UNKNOWN",reason:"UNSUPPORTED_GATE"});continue;
  }
  if(seen.has(gate)){
   failures.push({gate,reason:"DUPLICATE_RECEIPT"});continue;
  }
  seen.add(gate);
  const evidenceId=receipt.claims.evidenceId;
  if(evidenceIds.has(evidenceId)){
   failures.push({gate,reason:"REPLAYED_EVIDENCE_ID"});
   continue;
  }
  evidenceIds.add(evidenceId);
  const signer=receipt.claims.signer;
  const trustedKey=Object.hasOwn(trustedKeys,signer)?trustedKeys[signer]:null;
  if(typeof trustedKey!=="string"){
   failures.push({gate,reason:"TRUSTED_KEY_NOT_CONFIGURED"});continue;
  }
  try{
   const review=inspectPay54SignedReleaseReceipt({
    claims:receipt.claims,
    signatureBase64:receipt.signatureBase64,
    trustedPublicKeyPem:trustedKey,
    expectedCommitSha:commitSha,
    expectedSigner:signer
   });
   if(!review.signatureValid){
    failures.push({gate,reason:"INVALID_SIGNATURE"});
   }
  }catch{
   failures.push({gate,reason:"INVALID_RECEIPT"});
  }
 }
 for(const gate of PAY54_RELEASE_GATES){
  if(!seen.has(gate))failures.push({gate,reason:"MISSING_RECEIPT"});
 }
 return Object.freeze({
  schema:"pay54.signed-release-bundle.v1",
  reviewedCommit:commitSha,
  requiredGateCount:PAY54_RELEASE_GATES.length,
  evaluatedGateCount:seen.size,
  failures:Object.freeze(failures.map(f=>Object.freeze(f))),
  signaturesValidAndComplete:failures.length===0,
  registryProvenanceVerified:false,
  operationalEvidenceVerified:false,
  releaseAuthorised:false,
  productionRelease:"BLOCKED"
 });
}
