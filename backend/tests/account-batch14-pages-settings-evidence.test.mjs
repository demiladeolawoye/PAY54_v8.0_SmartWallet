"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessPay54PagesSettingsSnapshot}
 from "../governance/pay54-pages-settings-evidence-review.mjs";

const valid=()=>({
 repository:"demiladeolawoye/PAY54_v8.0_SmartWallet",
 commitSha:"e".repeat(40),buildType:"workflow",
 publicationRoot:"/site",deployEnvironment:"github-pages",
 requireEnvironmentReviewers:true,httpsEnforced:true,
 hostname:"demiladeolawoye.github.io",
 originEvidenceIndependentlyCollected:true
});
test("451: plausible Pages settings are never treated as authentic live configuration",()=>{
 const r=assessPay54PagesSettingsSnapshot(valid());
 assert.equal(r.declaredSettingsPolicySatisfied,true);
 assert.equal(r.liveGithubSettingsIndependentlyVerified,false);
 assert.equal(r.releaseAuthorised,false);
 assert.equal(r.productionRelease,"BLOCKED");
});
test("451: Pages publishing from repository root must be rejected",()=>{
 const s=valid();s.publicationRoot="/";
 const r=assessPay54PagesSettingsSnapshot(s);
 assert.ok(r.failures.includes("RESTRICTED_PUBLICATION_ROOT_UNVERIFIED"));
});
test("451: unprotected Pages environment, HTTP and branch source are denied",()=>{
 for(const [key,value] of [
  ["buildType","legacy"],["requireEnvironmentReviewers",false],
  ["httpsEnforced",false],["deployEnvironment","production"],
  ["hostname","evil.github.io"],["originEvidenceIndependentlyCollected",false]
 ]){
  const s=valid();s[key]=value;
  assert.equal(assessPay54PagesSettingsSnapshot(s).declaredSettingsPolicySatisfied,false);
 }
});
test("451: malformed evidence is refused",()=>{
 assert.throws(()=>assessPay54PagesSettingsSnapshot(null),/SNAPSHOT_REQUIRED/);
 const s=valid();s.commitSha="short";
 assert.ok(assessPay54PagesSettingsSnapshot(s).failures.includes("UNVERIFIED_SOURCE_COMMIT"));
});
