"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54ReleaseEvidenceCheckpoint as inspect}
 from "../governance/pay54-batch27-release-evidence-checkpoint.mjs";
const sha="a".repeat(40);
const offices=["security","database","devsecops",
 "compliance","qa","release"];
const evidence=Object.fromEntries(offices.map(x=>[x,{
 sourceSha:sha,evidenceDigest:"b".repeat(64),
 signedByIndependentReviewer:true}]));
test("1183: six-office claimed source attestations cannot self-approve production",()=>{
 const r=inspect({sourceSha:sha,officeEvidence:evidence});
 assert.equal(r.structurallyReadyForExternalReview,true);
 assert.equal(r.productionReleaseAuthorised,false);
 assert.equal(r.realStagingEnvironmentVerified,false);
});
test("1183: missing Compliance and wrong-source QA proof prevent review readiness",()=>{
 const data={...evidence,compliance:{...evidence.compliance,
  signedByIndependentReviewer:false},qa:{...evidence.qa,
  sourceSha:"c".repeat(40)}};
 const r=inspect({sourceSha:sha,officeEvidence:data});
 assert.ok(r.claimedIncompleteOffices.includes("compliance"));
 assert.ok(r.claimedIncompleteOffices.includes("qa"));
 assert.equal(r.productionReleaseAuthorised,false);
});
