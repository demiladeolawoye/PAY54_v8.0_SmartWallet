"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54PagesSettingsChange as inspect}
 from "../governance/pay54-batch27-pages-settings-diff.mjs";
const r={schema:"pay54.pages-settings-api-observation.v1",
 repositoryFullName:"demiladeolawoye/PAY54_v8.0_SmartWallet",
 observedAtMs:1800000000000,buildType:"workflow",
 sourceBranch:null,sourceDirectory:null,customDomain:"getpay54.com",
 sourceRootRisk:false,productionDeploymentAuthorised:false};
test("1129: change from workflow to root publishing raises risk",()=>{
 const result=inspect({before:r,after:{...r,observedAtMs:r.observedAtMs+1000,
  buildType:"legacy",sourceBranch:"project-titan",sourceDirectory:"/",
  sourceRootRisk:true}});
 assert.equal(result.rootSourceNewlyEnabled,true);
 assert.ok(result.changedFields.includes("buildType"));
 assert.equal(result.deploymentAuthorised,false);
});
test("1129: stale snapshot, different repo and forged approval denied",()=>{
 for(const after of [{...r,observedAtMs:r.observedAtMs-1},
  {...r,observedAtMs:r.observedAtMs+1,
   repositoryFullName:"attacker/repo"},
  {...r,observedAtMs:r.observedAtMs+1,
   productionDeploymentAuthorised:true}])
 assert.throws(()=>inspect({before:r,after}),/PAGES_SETTINGS_DIFF_DENIED/);
});
