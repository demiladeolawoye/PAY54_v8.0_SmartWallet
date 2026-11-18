"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {classifyPay54PagesArtifactRisk}
 from "../governance/pay54-pages-artifact-risk-triage.mjs";
const archive=()=>({
 schema:"pay54.pages-tar-member-index.v1",
 archiveSourceBoundaryPassed:false,
 blockedRoots:[{root:"backend",count:348},{root:"docs",count:150}]
});
test("486: proven archive leak does not imply verified public URL reachability",()=>{
 const r=classifyPay54PagesArtifactRisk({archiveReview:archive()});
 assert.equal(r.artifactBoundaryStatus,"FAILED");
 assert.equal(r.containmentReviewPriority,"P0");
 assert.equal(r.publicReachabilityStatus,"UNVERIFIED");
 assert.equal(r.publicSecretExposureEstablished,false);
 assert.equal(r.riskCleared,false);
 assert.equal(r.productionRelease,"BLOCKED");
});
test("486: a sampled 404 cannot close a packaging failure",()=>{
 const r=classifyPay54PagesArtifactRisk({
  archiveReview:archive(),
  publicReachability:"CONFIRMED_NOT_ACCESSIBLE_FOR_SAMPLED_PATHS"
 });
 assert.equal(r.artifactBoundaryStatus,"FAILED");
 assert.equal(r.publicReachabilityStatus,"SAMPLED_PATHS_NOT_ACCESSIBLE");
 assert.equal(r.riskCleared,false);
});
test("486: confirmed sensitive public content requires incident response",()=>{
 const r=classifyPay54PagesArtifactRisk({
  archiveReview:archive(),
  publicReachability:"CONFIRMED_ACCESSIBLE",
  contentSensitivity:"CONFIRMED_SENSITIVE"
 });
 assert.equal(r.publicSecretExposureEstablished,true);
 assert.ok(r.findings.includes("SENSITIVE_CONTENT_REQUIRES_SECURITY_RESPONSE"));
 assert.equal(r.releaseAuthorised,false);
});
test("486: source policy passing cannot automatically approve release",()=>{
 const r=classifyPay54PagesArtifactRisk({
  archiveReview:{...archive(),blockedRoots:[],archiveSourceBoundaryPassed:true}
 });
 assert.equal(r.artifactBoundaryStatus,"SOURCE_POLICY_PASSED");
 assert.equal(r.riskCleared,false);
 assert.equal(r.productionRelease,"BLOCKED");
});
test("486: missing or unsupported artifact review is rejected",()=>{
 assert.throws(()=>classifyPay54PagesArtifactRisk(null),/TAR_REVIEW_REQUIRED/);
 assert.throws(()=>classifyPay54PagesArtifactRisk({
  archiveReview:{schema:"forged"}
 }),/TAR_REVIEW_REQUIRED/);
});
