"use strict";

/**
 * PAY54 Batch 19 item 671 — bounded read-only public-path evidence review.
 *
 * Accepts only independently collected *metadata* for a restricted sample.
 * Never fetches a URL, reads a secret, or derives a breach/safety verdict
 * from HEAD-only observations or a single negative sample.
 */
const HEX=/^[a-f0-9]{64}$/;
const METHODS=new Set(["HEAD","GET"]);
const MAX=15;
const PATH=/^\/(?:PAY54_v8\.0_SmartWallet\/)?[A-Za-z0-9._/-]{1,180}$/;
const FORBIDDEN=/\b(?:secret|password|token|credential|private-key)\b/i;
export function reviewPay54PublicPathEvidence({samples=[]}={}){
 if(!Array.isArray(samples)||samples.length>MAX){
  throw new TypeError("PAY54_PUBLIC_SAMPLE_ARRAY_INVALID");
 }
 const findings=[],summaries=[];
 for(const item of samples){
  if(!item||typeof item!=="object"||Array.isArray(item)||
   typeof item.path!=="string"||!PATH.test(item.path)||
   item.path.includes("//")||item.path.split("/").includes("..")||
   FORBIDDEN.test(item.path)||
   !METHODS.has(item.method)||
   !Number.isSafeInteger(item.status)||item.status<100||item.status>599){
   throw new Error("PAY54_PUBLIC_SAMPLE_METADATA_INVALID");
  }
  const contentMatched=item.method==="GET"&&
   HEX.test(item.responseSha256??"")&&
   HEX.test(item.expectedArtifactSha256??"")&&
   item.responseSha256===item.expectedArtifactSha256&&
   item.contentRetrievedAndReviewed===true;
  if(item.method==="HEAD"&&item.status===200){
   findings.push("HEAD_200_IS_NOT_CONTENT_MATCH");
  }
  if(item.status===404||item.status===403){
   findings.push("NEGATIVE_SAMPLE_IS_NOT_SITEWIDE_SAFETY_PROOF");
  }
  if(item.status===200&&item.method==="GET"&&!contentMatched){
   findings.push("HTTP_GET_WITHOUT_VERIFIED_ARTIFACT_DIGEST");
  }
  summaries.push(Object.freeze({
   pathCategory:item.path.split("/").filter(Boolean).slice(0,2).join("/"),
   method:item.method,
   status:item.status,
   verifiedContentMatch:contentMatched
  }));
 }
 return Object.freeze({
  schema:"pay54.batch19-public-path-samples.v1",
  sampleCount:summaries.length,
  samples:Object.freeze(summaries),
  findings:Object.freeze([...new Set(findings)]),
  independentNetworkObservationVerified:false,
  currentDeploymentOriginAuthenticated:false,
  liveInternalSourceReachabilityConfirmed:false,
  allInternalPathsProvenSafe:false,
  incidentImpactAssessed:false,
  releaseApproved:false,
  productionRelease:"BLOCKED"
 });
}
