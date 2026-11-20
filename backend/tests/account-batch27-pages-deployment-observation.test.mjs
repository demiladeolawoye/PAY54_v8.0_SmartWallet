"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54PagesDeploymentObservation as inspect}
 from "../governance/pay54-batch27-pages-deployment-observation.mjs";
const sha="a".repeat(40),input={repositoryFullName:"demiladeolawoye/PAY54_v8.0_SmartWallet",
 expectedSourceSha:sha,reviewedAtMs:1800000000000,
 response:{id:1234,status:"success",sha,environment:"github-pages"}};
test("1071: successful provider deployment status is not live artifact proof",()=>{
 const r=inspect(input);
 assert.equal(r.providerReportedStatus,"success");
 assert.equal(r.activeDeploymentVerified,false);
 assert.equal(r.artifactBytesRetrieved,false);
 assert.equal(r.productionDeploymentAuthorised,false);
});
test("1071: SHA mismatches, rogue environment and forged deployment status deny",()=>{
 for(const change of [
  {expectedSourceSha:"b".repeat(40)},
  {response:{...input.response,environment:"production"}},
  {response:{...input.response,status:"unknown"}},
  {response:{...input.response,id:"-1"}},
  {repositoryFullName:"attacker/clone"}
 ])assert.throws(()=>inspect({...input,...change}),
 /PAGES_DEPLOYMENT_OBSERVATION_DENIED/);
});
