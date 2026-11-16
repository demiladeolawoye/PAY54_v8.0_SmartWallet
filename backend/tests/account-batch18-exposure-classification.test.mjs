"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {classifyPay54PagesExposure}
 from "../governance/pay54-batch18-exposure-classification.mjs";
test("645: confirmed historical archive does not prove current public reachability",()=>{
 const r=classifyPay54PagesExposure({
  historicalArtifactOverbroad:true,
  activePublicReachability:"UNVERIFIED",
  contentSensitivity:"UNVERIFIED"
 });
 assert.equal(r.historicalPackageBoundaryFailed,true);
 assert.equal(r.sampledLiveContentMatchConfirmed,false);
 assert.equal(r.sensitiveLiveContentEvidenceConfirmed,false);
 assert.equal(r.severity,"P0_REVIEW");
 assert.equal(r.publicBreachDeclared,false);
 assert.equal(r.productionRelease,"BLOCKED");
});
test("645: HEAD-only status and sampled 404 cannot claim a safe public site",()=>{
 for(const status of ["HTTP_STATUS_ONLY","SAMPLED_PATHS_UNREACHABLE"]){
  const r=classifyPay54PagesExposure({
   historicalArtifactOverbroad:true,activePublicReachability:status
  });
  assert.equal(r.allPublicInternalPathsProvedSafe,false);
  assert.equal(r.incidentClosureAuthorised,false);
  assert.equal(r.liveContainmentExecuted,false);
 }
});
test("645: verified current content and sensitivity trigger incident review, not automatic declaration",()=>{
 const r=classifyPay54PagesExposure({
  historicalArtifactOverbroad:true,
  activePublicReachability:"CONTENT_MATCH_CONFIRMED",
  contentSensitivity:"SENSITIVE_CREDENTIAL_OR_PERSONAL_DATA_CONFIRMED",
  currentDeploymentCommitIndependentlyConfirmed:true
 });
 assert.equal(r.sensitiveLiveContentEvidenceConfirmed,true);
 assert.ok(r.findings.includes("PRIVATE_CONTENT_IMPACT_REQUIRES_INCIDENT_RESPONSE"));
 assert.equal(r.publicBreachDeclared,false);
 assert.equal(r.productionRelease,"BLOCKED");
});
test("645: unsupported statuses and null input are fail-closed",()=>{
 assert.throws(()=>classifyPay54PagesExposure(null),/INPUT_REQUIRED/);
 const r=classifyPay54PagesExposure({activePublicReachability:"ALL_SAFE"});
 assert.equal(r.sampledLiveContentMatchConfirmed,false);
 assert.equal(r.allPublicInternalPathsProvedSafe,false);
});
