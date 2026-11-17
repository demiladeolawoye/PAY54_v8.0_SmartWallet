"use strict";
/** Batch27/1079: Parse GitHub protection state without trusting missing API data. */
const deny=()=>{throw Error("PAY54_BRANCH_PROTECTION_OBSERVATION_DENIED");};
export function inspectPay54BranchProtection({
 repositoryFullName,branchName,apiStatus,protection
}={}){
 if(repositoryFullName!=="demiladeolawoye/PAY54_v8.0_SmartWallet"||
    !["project-titan","main"].includes(branchName)||
    apiStatus!==200 ||!protection ||
    typeof protection!=="object" ||
    !protection.required_pull_request_reviews ||
    !Number.isInteger(protection.required_pull_request_reviews.required_approving_review_count) ||
    !protection.required_status_checks ||
    typeof protection.required_status_checks.strict!=="boolean" ||
    typeof protection.enforce_admins?.enabled!=="boolean" ||
    typeof protection.restrictions!=="object")deny();
 const count=protection.required_pull_request_reviews.required_approving_review_count;
 const qualified=count>=2 &&
    protection.required_status_checks.strict===true &&
    protection.enforce_admins.enabled===true &&
    protection.required_pull_request_reviews.dismiss_stale_reviews===true;
 return Object.freeze({
  schema:"pay54.github-branch-protection-observation.v1",
  branchName,reviewerCount:count,
  sourcePolicyAppearsStrict:qualified,
  responseAuthenticatedByIndependentReviewer:false,
  bypassRulesIndependentlyInspected:false,
  currentEffectiveBranchControlVerified:false,
  productionReleaseAuthorised:false
 });
}
