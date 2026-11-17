"use strict";
/** Batch26 1025 — signed reviewer statement over Pages source evidence. */
import {createPublicKey,verify} from "node:crypto";
const SHA=/^[0-9a-f]{40}$/;
const DIGEST=/^[0-9a-f]{64}$/;
const deny=()=>{throw new Error("PAY54_PAGES_ATTESTATION_DENIED");};
export function encodePay54PagesAttestation({commitSha,artifactSha256,
 reviewerId,signedAtMs,decision}={}){
 if(!SHA.test(commitSha??"") || !DIGEST.test(artifactSha256??"") ||
    !/^[a-z0-9_-]{4,64}$/.test(reviewerId??"") ||
    !Number.isSafeInteger(signedAtMs)||signedAtMs<=0 ||
    !["REVIEW_REQUIRED","POTENTIAL_EXPOSURE","NO_SOURCE_MATCH"].includes(decision))deny();
 return Buffer.from(["PAY54_PAGES_ATTESTATION_V1",commitSha,artifactSha256,
 reviewerId,String(signedAtMs),decision].join("\n"));
}
export function verifyPay54PagesAttestation({statement,signature,
 trustedReviewerPublicKey,expectedCommitSha,trustedNowMs=Date.now()}={}){
 if(!statement || typeof statement!=="object" ||
    statement.commitSha!==expectedCommitSha ||
    typeof signature!=="string" ||
    !/^[A-Za-z0-9_-]{86}$/.test(signature))deny();
 // A private KeyObject or private-key PEM must never be accepted as a
 // configured verification trust root, even though createPublicKey can
 // derive a public key from private material.
 if(trustedReviewerPublicKey?.type==="private" ||
    trustedReviewerPublicKey?.type==="secret" ||
    (typeof trustedReviewerPublicKey==="string" &&
     /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(trustedReviewerPublicKey)) ||
    (Buffer.isBuffer(trustedReviewerPublicKey) &&
     /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(
      trustedReviewerPublicKey.toString("utf8"))))deny();
 let key;
 try{
  key=trustedReviewerPublicKey?.type==="public"
   ? trustedReviewerPublicKey
   : createPublicKey(trustedReviewerPublicKey);
 }catch{deny();}
 if(key?.type!=="public" || key.asymmetricKeyType!=="ed25519")deny();
 const bytes=Buffer.from(signature,"base64url");
 if(bytes.length!==64||bytes.toString("base64url")!==signature ||
    !verify(null,encodePay54PagesAttestation(statement),key,bytes))deny();
 const age=trustedNowMs-statement.signedAtMs;
 if(!Number.isSafeInteger(trustedNowMs)||age<0||age>86400000)deny();
 return Object.freeze({
  schema:"pay54.signed-pages-review-v1",reviewerId:statement.reviewerId,
  sourceCommitSha:expectedCommitSha,
  signatureVerified:true,
  statementIndependentlyFactChecked:false,
  publicPagesContainmentProven:false,
  productionDeploymentAuthorised:false
 });
}
