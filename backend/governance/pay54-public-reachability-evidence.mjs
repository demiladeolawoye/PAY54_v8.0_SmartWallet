"use strict";

/**
 * PAY54 item 497 — independent public URL content-evidence classification.
 * Consumes redacted, externally captured response metadata. Never sends HTTP
 * requests or retrieves body bytes. A 2xx HEAD response is not content proof.
 */
const ID=/^PAY54-WEB-[A-Z0-9-]{6,64}$/;
const HEX=/^[a-f0-9]{64}$/;
const ROUTE=/^[a-zA-Z0-9._/-]{1,240}$/;
const FORBIDDEN=/^(?:backend|docs|infrastructure|terraform|tests)(?:\/|$)/i;
export function reviewPay54PublicReachabilityEvidence({
 observations,collectionAuthorised
}={}){
 if(!Array.isArray(observations)||observations.length>50){
  throw new TypeError("PAY54_PUBLIC_URL_EVIDENCE_REQUIRED");
 }
 const seen=new Set(),details=[],issues=[];
 for(const evidence of observations){
  const path=evidence?.path;
  if(typeof path!=="string"||!ROUTE.test(path)||
   path.startsWith("/")||path.split("/").some(x=>x===""||x==="."||x==="..")||
   !ID.test(evidence?.evidenceId??"")||
   !Number.isInteger(evidence?.status)||
   evidence.status<100||evidence.status>599){
   issues.push("INVALID_OBSERVATION");continue;
  }
  if(seen.has(path)){
   issues.push("DUPLICATE_ROUTE");continue;
  }
  seen.add(path);
  const isContentProof=evidence.method==="GET"&&
   evidence.contentSha256&&HEX.test(evidence.contentSha256)&&
   evidence.status>=200&&evidence.status<300&&
   evidence.authorisedContentComparison===true;
  const internal=FORBIDDEN.test(path);
  details.push(Object.freeze({
   internalRoute:internal,
   classification:isContentProof?
    (internal?"INTERNAL_CONTENT_DIGEST_RECORDED":"PUBLIC_CONTENT_DIGEST_RECORDED"):
    evidence.status===404?"HTTP_404_SAMPLED":
    evidence.method==="HEAD"?"HEAD_ONLY_INCONCLUSIVE":"REACHABILITY_UNVERIFIED",
   evidenceId:evidence.evidenceId
  }));
 }
 return Object.freeze({
  schema:"pay54.public-content-observation-review.v1",
  observationCount:details.length,
  issues:Object.freeze(issues),
  details:Object.freeze(details),
  potentialInternalContentMatches:details.filter(x=>
   x.classification==="INTERNAL_CONTENT_DIGEST_RECORDED").length,
  authorisedCollectionRecorded:collectionAuthorised===true,
  observationOriginIndependentlyVerified:false,
  sensitiveDataDisclosureEstablished:false,
  allInternalRoutesProvenInaccessible:false,
  riskClosed:false,
  releaseAuthorised:false,
  productionRelease:"BLOCKED"
 });
}
