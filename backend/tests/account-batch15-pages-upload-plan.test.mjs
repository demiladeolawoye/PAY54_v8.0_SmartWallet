"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {reviewPay54PagesUploadPlan}
 from "../governance/pay54-pages-upload-plan-review.mjs";
const SHA="d".repeat(40),DIGEST="e".repeat(64);
const stage=()=>({
 schema:"pay54.local-publication-attestation.v1",
 sourceToStageMatches:true,sourceManifestSha256:DIGEST
});
const upload=()=>({
 repository:"demiladeolawoye/PAY54_v8.0_SmartWallet",
 commitSha:SHA,localDirectory:"site",contentManifestSha256:DIGEST,
 artifactScope:"STATIC_SITE_ONLY",allowBackendContent:false,
 excludesSourceMaps:true,deploymentEnvironment:"github-pages",
 environmentProtected:true,sourceOnlyDryRun:true
});
const assess=(changes={},s=stage())=>reviewPay54PagesUploadPlan({
 stageAttestation:s,upload:{...upload(),...changes},expectedCommitSha:SHA
});
test("501: structurally safe upload plan does not deploy or approve",()=>{
 const r=assess();
 assert.equal(r.uploadPlanStructurallySafe,true);
 assert.equal(r.actualWorkflowSettingsVerified,false);
 assert.equal(r.uploadPerformed,false);
 assert.equal(r.releaseAuthorised,false);
 assert.equal(r.productionRelease,"BLOCKED");
});
test("501: upload from repository root, backend or build root is denied",()=>{
 for(const localDirectory of [".","./","backend","/","build"]){
  const r=assess({localDirectory});
  assert.ok(r.findings.includes("UNRESTRICTED_UPLOAD_DIRECTORY"));
 }
});
test("501: wrong source digest, commit or scope fails closed",()=>{
 for(const changes of [
  {contentManifestSha256:"f".repeat(64)},
  {commitSha:"0".repeat(40)},
  {allowBackendContent:true},
  {artifactScope:"ALL_REPOSITORY_FILES"},
  {environmentProtected:false},
  {sourceOnlyDryRun:false}
 ]){
  assert.equal(assess(changes).uploadPlanStructurallySafe,false);
 }
});
test("501: source stage failure cannot be bypassed by upload metadata",()=>{
 const r=assess({}, {...stage(),sourceToStageMatches:false});
 assert.ok(r.findings.includes("STAGED_SOURCE_UNVERIFIED"));
});
