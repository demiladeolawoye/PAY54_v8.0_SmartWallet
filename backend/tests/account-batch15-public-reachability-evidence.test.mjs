"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {reviewPay54PublicReachabilityEvidence}
 from "../governance/pay54-public-reachability-evidence.mjs";
const sample=(change={})=>({
 path:"backend/security/module.mjs",
 evidenceId:"PAY54-WEB-CONTENT-0001",
 status:200,method:"GET",contentSha256:"a".repeat(64),
 authorisedContentComparison:true,...change
});
test("498: matching content-digest metadata is a review observation, not disclosure proof",()=>{
 const r=reviewPay54PublicReachabilityEvidence({
  observations:[sample()],collectionAuthorised:true
 });
 assert.equal(r.potentialInternalContentMatches,1);
 assert.equal(r.details[0].classification,"INTERNAL_CONTENT_DIGEST_RECORDED");
 assert.equal(r.observationOriginIndependentlyVerified,false);
 assert.equal(r.sensitiveDataDisclosureEstablished,false);
 assert.equal(r.riskClosed,false);
 assert.equal(r.productionRelease,"BLOCKED");
});
test("498: 200 HEAD response never counts as content proof",()=>{
 const r=reviewPay54PublicReachabilityEvidence({
  observations:[sample({method:"HEAD",contentSha256:null})]
 });
 assert.equal(r.potentialInternalContentMatches,0);
 assert.equal(r.details[0].classification,"HEAD_ONLY_INCONCLUSIVE");
});
test("498: 404 on one sampled route does not establish overall safety",()=>{
 const r=reviewPay54PublicReachabilityEvidence({
  observations:[sample({method:"GET",status:404,contentSha256:null})]
 });
 assert.equal(r.details[0].classification,"HTTP_404_SAMPLED");
 assert.equal(r.allInternalRoutesProvenInaccessible,false);
 assert.equal(r.riskClosed,false);
});
test("498: traversal, duplicate route and forged observation are rejected",()=>{
 const r=reviewPay54PublicReachabilityEvidence({
  observations:[sample(),sample(),sample({path:"../internal"})]
 });
 assert.ok(r.issues.includes("DUPLICATE_ROUTE"));
 assert.ok(r.issues.includes("INVALID_OBSERVATION"));
 assert.equal(r.productionRelease,"BLOCKED");
});
