"use strict";

/**
 * PAY54 item 491 — safe, non-disclosing artifact secret-marker evidence triage.
 * Does not inspect arbitrary payloads or expose matched secret material. A
 * pattern match is not equivalent to credential validity or public disclosure.
 */
const ALLOWED_RULES=new Set([
 "PRIVATE_KEY_BLOCK","GITHUB_TOKEN","GITHUB_FINE_GRAINED_TOKEN",
 "AWS_ACCESS_KEY","STRIPE_LIVE_SECRET"
]);
const MAX_FINDINGS=100;
const PATH=/^[a-zA-Z0-9._/-]{1,250}$/;

export function reviewPay54PagesSecretMarkerEvidence({findings}={}){
 if(!Array.isArray(findings)||findings.length>MAX_FINDINGS){
  throw new TypeError("PAY54_MARKER_EVIDENCE_LIST_REQUIRED");
 }
 const reviewed=[],issues=[];
 for(const item of findings){
  if(!item||!ALLOWED_RULES.has(item.ruleId)||
   !PATH.test(item.path??"")||item.path.startsWith("/")||
   item.path.split("/").some(x=>x==="."||x===".."||x==="")){
   issues.push("INVALID_MARKER_RECORD");continue;
  }
  const testFixture=/^(?:backend\/tests\/|tests\/|fixtures\/)/.test(item.path);
  reviewed.push(Object.freeze({
   root:item.path.split("/",1)[0],
   ruleId:item.ruleId,
   classification:testFixture?"TEST_FIXTURE_CANDIDATE":"UNRESOLVED_CREDENTIAL_MARKER"
  }));
 }
 const unresolvedCount=reviewed.filter(x=>
  x.classification==="UNRESOLVED_CREDENTIAL_MARKER").length;
 return Object.freeze({
  schema:"pay54.pages-secret-marker-triage.v1",
  reviewed:Object.freeze(reviewed),
  issues:Object.freeze(issues),
  markerCount:reviewed.length,
  unresolvedCount,
  independentCredentialValidityVerified:false,
  actualPublicDisclosureConfirmed:false,
  credentialCompromiseEstablished:false,
  ownerSecurityReviewRequired:reviewed.length>0||issues.length>0,
  releaseAuthorised:false,
  productionRelease:"BLOCKED"
 });
}
