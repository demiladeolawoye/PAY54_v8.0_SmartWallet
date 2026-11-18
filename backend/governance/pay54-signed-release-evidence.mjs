"use strict";

/**
 * PAY54 item 428 — deterministic Ed25519 evidence receipt verifier.
 *
 * Accepts an independently supplied trusted public key, NEVER a key asserted
 * by the evidence payload itself. Validates exact canonical claims, commit,
 * signer identity and signature, but cannot attest the public key's operational
 * trust binding or authorise a release.
 */
import {createPublicKey,verify,createHash} from "node:crypto";

const COMMIT=/^[0-9a-f]{40}$/;
const BASE64=/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const IDENTIFIER=/^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$/;
const RECEIPT_VERSION="pay54.release-evidence-receipt.v1";

function canonicalClaims(claims){
 if(!claims||typeof claims!=="object"||Array.isArray(claims)){
  throw new TypeError("PAY54_RECEIPT_CLAIMS_REQUIRED");
 }
 const keys=Object.keys(claims).sort();
 const allowed=["commitSha","evidenceId","gate","reviewedAt","reviewer","signer","version"];
 if(keys.length!==allowed.length||keys.some((key,index)=>key!==allowed[index])){
  throw new Error("PAY54_RECEIPT_CLAIMS_SCHEMA_DENIED");
 }
 for(const key of allowed){
  if(typeof claims[key]!=="string"||!claims[key]){
   throw new Error("PAY54_RECEIPT_FIELD_INVALID");
  }
 }
 if(claims.version!==RECEIPT_VERSION||!COMMIT.test(claims.commitSha)||
  !IDENTIFIER.test(claims.signer)||!IDENTIFIER.test(claims.reviewer)||
  claims.signer===claims.reviewer||!claims.evidenceId.startsWith("PAY54-EV-")){
  throw new Error("PAY54_RECEIPT_IDENTITY_DENIED");
 }
 const stamp=Date.parse(claims.reviewedAt);
 if(!Number.isFinite(stamp)||!/^\d{4}-\d{2}-\d{2}T/.test(claims.reviewedAt)){
  throw new Error("PAY54_RECEIPT_DATE_DENIED");
 }
 return Buffer.from(JSON.stringify(Object.fromEntries(
  allowed.map(key=>[key,claims[key]])
 )),"utf8");
}

export function inspectPay54SignedReleaseReceipt({
 claims,signatureBase64,trustedPublicKeyPem,expectedCommitSha,expectedSigner
}={}){
 const canonical=canonicalClaims(claims);
 if(!COMMIT.test(expectedCommitSha??"")||expectedCommitSha!==claims.commitSha){
  throw new Error("PAY54_RECEIPT_COMMIT_MISMATCH");
 }
 if(!IDENTIFIER.test(expectedSigner??"")||expectedSigner!==claims.signer){
  throw new Error("PAY54_RECEIPT_SIGNER_MISMATCH");
 }
 if(typeof signatureBase64!=="string"||!BASE64.test(signatureBase64)||
  signatureBase64.length!==88){
  throw new Error("PAY54_RECEIPT_SIGNATURE_INVALID");
 }
 if(typeof trustedPublicKeyPem!=="string"||!trustedPublicKeyPem.includes("BEGIN PUBLIC KEY")){
  throw new Error("PAY54_RECEIPT_TRUSTED_KEY_REQUIRED");
 }
 const key=createPublicKey(trustedPublicKeyPem);
 if(key.asymmetricKeyType!=="ed25519"){
  throw new Error("PAY54_RECEIPT_KEY_ALGORITHM_DENIED");
 }
 const signature=Buffer.from(signatureBase64,"base64");
 if(signature.length!==64||signature.toString("base64")!==signatureBase64){
  throw new Error("PAY54_RECEIPT_SIGNATURE_ENCODING_DENIED");
 }
 const signatureValid=verify(null,canonical,key,signature);
 const publicKeyFingerprint=createHash("sha256")
  .update(key.export({type:"spki",format:"der"})).digest("hex");
 return Object.freeze({
  schema:"pay54.release-evidence-crypto-review.v1",
  commitSha:claims.commitSha,
  evidenceId:claims.evidenceId,
  signer:claims.signer,
  publicKeyFingerprint,
  signatureValid,
  trustedKeyProvenanceIndependentlyVerified:false,
  evidenceFactsIndependentlyVerified:false,
  releaseAuthorised:false,
  productionRelease:"BLOCKED"
 });
}
