"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {reviewPay54PagesOwnerEvidence}
 from "../governance/pay54-batch18-pages-owner-evidence.mjs";
const valid=()=>({
 capturedAt:"2026-11-16T22:00:00Z",
 pagesSource:"github_actions",
 siteUrl:"https://demiladeolawoye.github.io/PAY54_v8.0_SmartWallet/",
 activeDeploymentCommit:"a".repeat(40),
 activeWorkflowRun:"43917703697",
 activeArtifactDigest:"b".repeat(64),
 environmentRestrictions:"Owner reviewed protected Pages environment",
 deployerIdentity:"Reviewed least-privileged deployer account",
 branchProtection:"Owner reviewed main and project-titan protections",
 reviewerEvidenceLink:"https://github.com/demiladeolawoye/PAY54_v8.0_SmartWallet/actions/runs/43917703697"
});
test("622: a complete owner-provided packet never proves active Pages state on its own",()=>{
 const r=reviewPay54PagesOwnerEvidence(valid());
 assert.equal(r.evidencePacketStructurallyComplete,true);
 assert.deepEqual(r.missingOrInvalid,[]);
 assert.equal(r.evidenceIndependentlyAuthenticated,false);
 assert.equal(r.currentSiteContentInspected,false);
 assert.equal(r.publicationApproved,false);
 assert.equal(r.productionRelease,"BLOCKED");
});
test("622: missing evidence fields fail closed",()=>{
 const r=reviewPay54PagesOwnerEvidence({});
 assert.equal(r.evidencePacketStructurallyComplete,false);
 assert.ok(r.missingOrInvalid.includes("MISSING_ACTIVEDEPLOYMENTCOMMIT"));
});
test("622: noncanonical URLs, arbitrary workflow IDs and invalid digests are rejected",()=>{
 const data=valid();
 data.siteUrl="https://evil.example/secure";
 data.activeWorkflowRun="not-a-run";
 data.activeArtifactDigest="sha256:";
 data.reviewerEvidenceLink="https://evil.example/credentials";
 const r=reviewPay54PagesOwnerEvidence(data);
 for(const value of [
  "SITE_URL_NOT_CANONICAL","ACTIVE_WORKFLOW_RUN_INVALID",
  "ACTIVE_ARTIFACT_DIGEST_INVALID","OWNER_REVIEW_LINK_NOT_REPOSITORY_BOUND"
 ])assert.ok(r.missingOrInvalid.includes(value),value);
});
test("622: nonobjects cannot be accepted as provenance",()=>{
 for(const bad of [null,[],42,"attested"]){
  assert.throws(()=>reviewPay54PagesOwnerEvidence(bad),/OBJECT_REQUIRED/);
 }
});
