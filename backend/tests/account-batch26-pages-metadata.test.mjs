"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54PagesDeploymentMetadata as inspect}
 from "../governance/pay54-batch26-pages-metadata.mjs";
const sha="a".repeat(40);
const data={
 repositoryFullName:"demiladeolawoye/PAY54_v8.0_SmartWallet",
 expectedCommitSha:sha,
 pagesConfig:{buildType:"legacy",sourceBranch:"project-titan",
  sourceDirectory:"/",customDomain:"getpay54.com"},
 deployment:{deploymentId:"1234",sourceSha:sha,artifactSha256:"b".repeat(64),
  publicUrl:"https://getpay54.com/index.html",createdAtMs:1800000000000}
};
test("1019: legacy project-titan root is classified as risky not confirmed exposure",()=>{
 const r=inspect(data);
 assert.equal(r.sourceRootPublicationRisk,true);
 assert.equal(r.metadataIndependentlyAuthenticated,false);
 assert.equal(r.pagesExposureResolved,false);
 assert.equal(r.deploymentAuthorised,false);
 assert.ok(Object.isFrozen(r));
});
test("1019: forged source SHA, external host, unsupported domain are denied",()=>{
 for(const changes of [
  {repositoryFullName:"attacker/repo"},
  {deployment:{...data.deployment,sourceSha:"c".repeat(40)}},
  {deployment:{...data.deployment,publicUrl:"https://evil.example/path"}},
  {pagesConfig:{...data.pagesConfig,customDomain:"evil.example"}},
  {pagesConfig:{...data.pagesConfig,sourceBranch:"attacker"}},
  {deployment:{...data.deployment,artifactSha256:"not-a-digest"}}
 ])assert.throws(()=>inspect({...data,...changes}),
  /PAGES_DEPLOYMENT_EVIDENCE_DENIED/);
});
test("1019: workflow metadata is still unverified without GitHub authentication",()=>{
 const r=inspect({...data,pagesConfig:{
  ...data.pagesConfig,buildType:"workflow",sourceDirectory:"/docs"
 }});
 assert.equal(r.legacyBranchSourceNeedsContainment,false);
 assert.equal(r.currentPublicArtifactAudited,false);
 assert.equal(r.artifactBytesCompared,false);
});
