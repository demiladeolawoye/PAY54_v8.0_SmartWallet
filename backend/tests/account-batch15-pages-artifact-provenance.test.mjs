"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {reviewPay54PagesArtifactProvenance}
 from "../governance/pay54-pages-artifact-provenance.mjs";
const sha="9fa996bd385b6714087038306a6532e8e7e5ff14";
const now="2026-11-16T19:45:00.000Z";
const fixture=()=>({
 repository:"demiladeolawoye/PAY54_v8.0_SmartWallet",
 name:"github-pages",workflowRunId:43917703697,
 sourceCommitSha:sha,artifactId:14252395793,
 bytes:1148828,createdAt:"2026-11-16T17:22:55Z",
 digest:"sha256:3ef9b7d42cde59d187ee6e9730ea351e8c3a025a796f618d9d230f93c3de1448",
 expired:false
});
const assess=artifact=>reviewPay54PagesArtifactProvenance({
 artifact,expectedCommitSha:sha,expectedRunId:43917703697,now
});
test("489: consistent evidence metadata cannot prove deployed contents",()=>{
 const r=assess(fixture());
 assert.equal(r.metadataConsistent,true);
 assert.equal(r.artifactBytesIndependentlyVerified,false);
 assert.equal(r.liveSiteReachabilityConfirmed,false);
 assert.equal(r.productionRelease,"BLOCKED");
});
test("489: modified digest, wrong run, wrong source SHA or unknown repository fail",()=>{
 for(const change of [
  {digest:"invalid"},
  {workflowRunId:1},
  {sourceCommitSha:"b".repeat(40)},
  {repository:"attacker/repo"},
  {expired:true}
 ]){
  assert.equal(assess({...fixture(),...change}).metadataConsistent,false);
 }
});
test("489: stale and future artifact timestamps are refused",()=>{
 for(const createdAt of ["2026-10-01T17:22:55Z","2026-11-17T17:22:55Z"]){
  const r=assess({...fixture(),createdAt});
  assert.ok(r.findings.includes("ARTIFACT_AGE_UNVERIFIED"));
 }
});
test("489: caller-supplied evidence cannot bypass required source expectations",()=>{
 assert.throws(()=>reviewPay54PagesArtifactProvenance({
  artifact:fixture(),expectedCommitSha:"",expectedRunId:43917703697,now
 }),/EXPECTATIONS_INVALID/);
 assert.throws(()=>assess(null),/PROVENANCE_REQUIRED/);
});
