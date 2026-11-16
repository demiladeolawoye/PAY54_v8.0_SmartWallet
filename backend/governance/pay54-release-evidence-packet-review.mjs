"use strict";

/**
 * PAY54 item 442: compose metadata completeness with independently signed
 * evidence checks, without duplicating or weakening either existing policy.
 *
 * Both assessments remain source-only. Matching metadata is not operational
 * identity proof and cannot authorise deployment.
 */
import {assessPay54ReleaseEvidence}
 from "./pay54-release-evidence-review.mjs";
import {assessPay54SignedReleaseBundle}
 from "./pay54-signed-release-bundle.mjs";

export function reviewPay54ReleaseEvidencePacket({
 commitSha,evidence,receipts,trustedKeys,reviewTime
}={}){
 const time=typeof reviewTime==="string"?new Date(reviewTime):new Date(NaN);
 const metadata=assessPay54ReleaseEvidence({
  commitSha,evidence
 },{now:time});
 const signatures=assessPay54SignedReleaseBundle({
  commitSha,receipts,trustedKeys,reviewTime
 });
 const mismatches=[];
 if(Array.isArray(evidence)&&Array.isArray(receipts)){
  const byGate=new Map(receipts.map(r=>[r?.claims?.gate,r?.claims]));
  for(const item of evidence){
   const signed=byGate.get(item?.gate);
   if(!signed)continue;
   if(item.evidenceId!==signed.evidenceId||
    item.commitSha!==signed.commitSha||
    item.reviewer!==signed.reviewer||
    item.reviewedAt!==signed.reviewedAt||
    item.owner!==signed.signer){
    mismatches.push(Object.freeze({gate:item.gate??"UNKNOWN",
     reason:"SIGNED_METADATA_MISMATCH"}));
   }
  }
 }
 const allSyntacticallyConsistent=metadata.evidenceMetadataComplete&&
  signatures.signaturesValidAndComplete&&mismatches.length===0;
 return Object.freeze({
  schema:"pay54.release-evidence-packet-review.v1",
  commitSha,
  metadata,
  signatures,
  crossChecks:Object.freeze(mismatches),
  cryptographicallyAndStructurallyConsistent:allSyntacticallyConsistent,
  trustedRegistryOperationallyAttested:false,
  underlyingFactsVerified:false,
  releaseAuthorised:false,
  productionRelease:"BLOCKED"
 });
}
