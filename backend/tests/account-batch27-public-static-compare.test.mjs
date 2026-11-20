"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {comparePay54PublicStaticObservation as compare}
 from "../governance/pay54-batch27-public-static-compare.mjs";
const sha="a".repeat(64);
const input={expectedPath:"index.html",reviewedCandidateSha256:sha,
 publicObservation:{schema:"pay54.public-static-byte-hash-observation.v1",
  publicPath:"index.html",sha256:sha,artifactReleaseAuthorised:false}};
test("1115: matching public content is still not a complete safe Pages review",()=>{
 const r=compare(input);
 assert.equal(r.observedBytesMatchReviewedCandidate,true);
 assert.equal(r.websiteContainmentConfirmed,false);
 assert.equal(r.productionReleaseAuthorised,false);
});
test("1115: stale public hash or wrong file path is denied/mismatched",()=>{
 const r=compare({...input,publicObservation:{
  ...input.publicObservation,sha256:"b".repeat(64)}});
 assert.equal(r.observedBytesMatchReviewedCandidate,false);
 assert.throws(()=>compare({...input,publicObservation:{
  ...input.publicObservation,publicPath:"backend/secrets"}}),
  /PUBLIC_STATIC_COMPARE_DENIED/);
});
