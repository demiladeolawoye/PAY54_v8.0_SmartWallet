"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {reviewPay54PagesDeployerSettings}
 from "../governance/pay54-batch18-deployer-evidence.mjs";
const valid=()=>({
 environmentName:"github-pages",
 permissions:["contents:read","pages:write","id-token:write"],
 branchProtectionEnforced:true,
 requiredReviewersEnforced:true,
 oidcWorkloadIdentityOnly:true,
 longLivedPersonalTokenDisabled:true,
 noPullRequestAutomaticDeployment:true,
 artifactIntegrityCheckRequired:true
});
test("654: least-privilege evidence packet is not direct access to GitHub settings",()=>{
 const r=reviewPay54PagesDeployerSettings(valid());
 assert.equal(r.claimedConfigurationStructurallySafe,true);
 assert.equal(r.githubControlPlaneIndependentlyRead,false);
 assert.equal(r.reviewerIdentityIndependentlyAuthenticated,false);
 assert.equal(r.permissionsChanged,false);
 assert.equal(r.pagesDeploymentExecuted,false);
 assert.equal(r.productionRelease,"BLOCKED");
});
test("654: bypass users, broad repository write and missing required reviewers fail",()=>{
 const p=valid();
 p.permissions.push("contents:write");
 p.requiredReviewersEnforced=false;
 const r=reviewPay54PagesDeployerSettings(p);
 assert.ok(r.findings.includes("DEPLOYER_PERMISSIONS_NOT_RESTRICTED"));
 assert.ok(r.findings.includes("ENVIRONMENT_REVIEWERS_UNVERIFIED"));
});
test("654: personal access token and automatic PR deployment are rejected",()=>{
 const p=valid();
 p.oidcWorkloadIdentityOnly=false;
 p.longLivedPersonalTokenDisabled=false;
 p.noPullRequestAutomaticDeployment=false;
 const r=reviewPay54PagesDeployerSettings(p);
 for(const key of ["OIDC_IDENTITY_UNVERIFIED","PERSONAL_TOKEN_CONTROL_UNVERIFIED",
  "PR_DEPLOYMENT_RESTRICTION_UNVERIFIED"]){
  assert.ok(r.findings.includes(key),key);
 }
});
test("654: missing account state is always untrusted",()=>{
 assert.throws(()=>reviewPay54PagesDeployerSettings(null),/INPUT_REQUIRED/);
 assert.equal(reviewPay54PagesDeployerSettings({}).claimedConfigurationStructurallySafe,false);
});
