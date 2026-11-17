"use strict";
/** PAY54 Batch 27 / 1148 — normalize independently collected environment policy. */
const deny=()=>{throw Error("PAY54_GITHUB_ENVIRONMENT_POLICY_DENIED");};
export function inspectPay54GithubEnvironmentPolicy({
 environmentName,observedEnvironment
}={}){
 if(!["pay54-staging","pay54-production"].includes(environmentName) ||
    observedEnvironment?.name!==environmentName ||
    !Array.isArray(observedEnvironment.protection_rules) ||
    observedEnvironment.protection_rules.length>20 ||
    !Array.isArray(observedEnvironment.deployment_branch_policy?.allowed_branches))deny();
 const reviewers=observedEnvironment.protection_rules.filter(x=>
  x?.type==="required_reviewers");
 const reviewerCount=reviewers.reduce((sum,x)=>
  sum+Math.min(Array.isArray(x.reviewers)?x.reviewers.length:0,20),0);
 const branchPolicy=observedEnvironment.deployment_branch_policy;
 const approvedBranch=branchPolicy.allowed_branches.includes("project-titan") &&
    branchPolicy.allowed_branches.every(x=>
      ["project-titan","release"].includes(x));
 return Object.freeze({
  schema:"pay54.github-environment-api-review.v1",
  environmentName,
  reviewerCount,
  reviewedBranchAllowlistRestricted:approvedBranch,
  independentReviewThresholdClaimed:reviewerCount>=2,
  githubApiAuthenticationIndependentOfCollector:false,
  protectionRulesLiveVerified:false,
  deploymentAuthorised:false
 });
}
