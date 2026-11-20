"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessPay54DeployerOidcClaims as assess}
 from "../governance/pay54-batch27-deployer-oidc.mjs";
const sha="a".repeat(40);
const claims={iss:"https://token.actions.githubusercontent.com",
 aud:"pay54:staging-release",
 repository:"demiladeolawoye/PAY54_v8.0_SmartWallet",
 repository_id:"12345678",ref:"refs/heads/project-titan",sha,
 sub:"repo:demiladeolawoye/PAY54_v8.0_SmartWallet:environment:pay54-staging",
 job_workflow_ref:"demiladeolawoye/PAY54_v8.0_SmartWallet/.github/workflows/pay54-staging-deploy.yml@refs/heads/project-titan"};
test("1078: OIDC claims match source policy but are NOT cryptographically authenticated",()=>{
 const r=assess({claims,expectedSha:sha});
 assert.equal(r.expectedIdentityClaimsMatched,true);
 assert.equal(r.jwtSignatureVerified,false);
 assert.equal(r.actualCloudWorkloadBindingInspected,false);
});
test("1078: PR event and arbitrary workflow cannot impersonate protected deployer",()=>{
 for(const change of [
  {ref:"refs/pull/15/merge"},
  {sha:"b".repeat(40)},
  {aud:"https://attacker.example"},
  {sub:"repo:attacker/repo:environment:pay54-staging"},
  {job_workflow_ref:"attacker/repo/.github/workflows/deploy.yml@main"},
  {repository_id:"invalid"}
 ])assert.throws(()=>assess({claims:{...claims,...change},expectedSha:sha}),
 /DEPLOYER_OIDC_CLAIM_DENIED/);
});
