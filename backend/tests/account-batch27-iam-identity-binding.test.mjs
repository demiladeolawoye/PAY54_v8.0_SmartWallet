"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54WorkloadIdentityBinding as inspect}
 from "../governance/pay54-batch27-iam-identity-binding.mjs";
const x={providerAudience:"pay54:staging-release",
 repositoryOwnerId:"123456",repositoryId:"654321",
 workflowRef:"demiladeolawoye/PAY54_v8.0_SmartWallet/.github/workflows/pay54-staging-deploy.yml@refs/heads/project-titan",
 allowedEnvironment:"pay54-staging"};
test("1127: exact OIDC subject policy does not prove cloud binding exists",()=>{
 const r=inspect(x);
 assert.equal(r.cloudFederationProviderActuallyInspected,false);
 assert.equal(r.deploymentAuthorised,false);
});
test("1127: attacker audience, PR workflow and reused numeric account IDs refused",()=>{
 for(const y of [{providerAudience:"attacker"},
  {allowedEnvironment:"production"},
  {workflowRef:"repo:evil/branch"},
  {repositoryId:x.repositoryOwnerId}])
 assert.throws(()=>inspect({...x,...y}),
 /WORKLOAD_IDENTITY_BINDING_DENIED/);
});
