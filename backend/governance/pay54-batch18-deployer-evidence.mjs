"use strict";

/**
 * PAY54 item 653 — restricted Pages deployer settings evidence review.
 * Checks a claimed configuration's minimum shape. Never reads GitHub
 * permissions, authenticates a deployer, adds IAM or approves a release.
 */
const SCOPE=new Set(["contents:read","pages:write","id-token:write"]);
export function reviewPay54PagesDeployerSettings(input={}){
 if(!input||typeof input!=="object"||Array.isArray(input)){
  throw new TypeError("PAY54_PAGES_DEPLOYER_INPUT_REQUIRED");
 }
 const issues=[];
 if(input.environmentName!=="github-pages"){
  issues.push("PAGES_ENVIRONMENT_MISSING");
 }
 const permissions=input.permissions;
 if(!Array.isArray(permissions)||permissions.some(x=>typeof x!=="string")||
  permissions.length!==SCOPE.size||
  permissions.some(x=>!SCOPE.has(x))||new Set(permissions).size!==SCOPE.size){
  issues.push("DEPLOYER_PERMISSIONS_NOT_RESTRICTED");
 }
 for(const [name,label] of [
  ["branchProtectionEnforced","BRANCH_RULES_UNVERIFIED"],
  ["requiredReviewersEnforced","ENVIRONMENT_REVIEWERS_UNVERIFIED"],
  ["oidcWorkloadIdentityOnly","OIDC_IDENTITY_UNVERIFIED"],
  ["longLivedPersonalTokenDisabled","PERSONAL_TOKEN_CONTROL_UNVERIFIED"],
  ["noPullRequestAutomaticDeployment","PR_DEPLOYMENT_RESTRICTION_UNVERIFIED"],
  ["artifactIntegrityCheckRequired","ARTIFACT_INTEGRITY_GATE_UNVERIFIED"]
 ]){
  if(input[name]!==true)issues.push(label);
 }
 return Object.freeze({
  schema:"pay54.pages-deployer-evidence-review.v1",
  claimedConfigurationStructurallySafe:issues.length===0,
  findings:Object.freeze(issues),
  githubControlPlaneIndependentlyRead:false,
  reviewerIdentityIndependentlyAuthenticated:false,
  permissionsChanged:false,
  pagesDeploymentExecuted:false,
  productionRelease:"BLOCKED"
 });
}
