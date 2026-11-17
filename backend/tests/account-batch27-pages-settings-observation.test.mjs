"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {normalisePay54PagesSettingsEvidence as inspect}
 from "../governance/pay54-batch27-pages-settings-observation.mjs";
const base={
 repositoryFullName:"demiladeolawoye/PAY54_v8.0_SmartWallet",
 apiStatus:200,authenticatedReviewerId:"security-reviewer",
 observedAtMs:1800000000000,
 response:{status:"built",build_type:"legacy",
  html_url:"https://getpay54.com/",
  cname:"getpay54.com",source:{branch:"project-titan",path:"/"}}
};
test("1069: Pages root publication is risky but no actual exposure is inferred",()=>{
 const r=inspect(base);
 assert.equal(r.sourceRootRisk,true);
 assert.equal(r.authenticatedGitHubApiOwnershipIndependentlyVerified,false);
 assert.equal(r.deployedArtifactContentsVerified,false);
 assert.equal(r.securityIncidentClosed,false);
 assert.equal(r.productionDeploymentAuthorised,false);
});
test("1069: authenticated workflow source is recorded without inferring safe artifact",()=>{
 const r=inspect({...base,response:{...base.response,
  build_type:"workflow",source:null}});
 assert.equal(r.sourceRootRisk,false);
 assert.equal(r.sourceBranch,null);
 assert.equal(r.deployedArtifactContentsVerified,false);
});
test("1069: HTTP 403/404, spoofed URL and arbitrary sources deny",()=>{
 for(const changes of [
  {apiStatus:403},{apiStatus:404},
  {repositoryFullName:"attacker/clone"},
  {response:{...base.response,html_url:"https://evil.example/"}},
  {response:{...base.response,html_url:"http://getpay54.com/"}},
  {response:{...base.response,source:{branch:"main",path:"/private"}}},
  {authenticatedReviewerId:"owner<script>"}
 ])assert.throws(()=>inspect({...base,...changes}),
  /PAGES_SETTINGS_EVIDENCE_DENIED/);
});
