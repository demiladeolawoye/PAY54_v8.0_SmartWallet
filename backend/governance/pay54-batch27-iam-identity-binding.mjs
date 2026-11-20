"use strict";
/** Batch27/1126 — strong source identity subject/audience binding review. */
const deny=()=>{throw Error("PAY54_WORKLOAD_IDENTITY_BINDING_DENIED");};
export function inspectPay54WorkloadIdentityBinding({
 providerAudience,repositoryOwnerId,repositoryId,
 workflowRef,allowedEnvironment
}={}){
 if(providerAudience!=="pay54:staging-release"||
    !/^[1-9][0-9]{3,19}$/.test(String(repositoryOwnerId??""))||
    !/^[1-9][0-9]{3,19}$/.test(String(repositoryId??"")) ||
    repositoryOwnerId===repositoryId ||
    workflowRef!=="demiladeolawoye/PAY54_v8.0_SmartWallet/.github/workflows/pay54-staging-deploy.yml@refs/heads/project-titan" ||
    allowedEnvironment!=="pay54-staging")deny();
 return Object.freeze({
  schema:"pay54.oidc-workload-subject-review.v1",
  numericRepositoryAndOwnerIdsSpecified:true,
  exactWorkflowAndEnvironmentBound:true,
  cloudFederationProviderActuallyInspected:false,
  actualRepositoryNumericIdentityIndependentlyVerified:false,
  deploymentAuthorised:false
 });
}
