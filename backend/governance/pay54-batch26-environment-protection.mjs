"use strict";
/** Batch26/1031 — GitHub environment metadata can't self-approve production. */
const deny=()=>{throw Error("PAY54_PROTECTED_ENVIRONMENT_DENIED");};
export function inspectPay54ProtectedEnvironment({
 environmentName,requiresReview,allowAdminBypass,
 allowedBranch,oidcAudience,reviewerCount
}={}){
 if(!["pay54-staging","pay54-production"].includes(environmentName) ||
    typeof requiresReview!=="boolean" ||
    typeof allowAdminBypass!=="boolean" ||
    !["project-titan","release"].includes(allowedBranch) ||
    typeof oidcAudience!=="string" ||
    oidcAudience!=="https://github.com/demiladeolawoye" ||
    !Number.isInteger(reviewerCount)||reviewerCount<0||reviewerCount>50)deny();
 const strict=requiresReview&&!allowAdminBypass&&reviewerCount>=2;
 return Object.freeze({
  schema:"pay54.github-environment-source-review.v1",
  environmentName,sourcePolicyLooksRestricted:strict,
  environmentSettingsAuthenticated:false,
  reviewersIndependentlyVerified:false,
  cloudOidcTrustIndependentlyVerified:false,
  productionDeploymentAuthorised:false
 });
}
