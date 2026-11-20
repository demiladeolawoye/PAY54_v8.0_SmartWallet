"use strict";
/** Batch27/1077: Strict OIDC deployment identity claim verification, source-only. */
const deny=()=>{throw Error("PAY54_DEPLOYER_OIDC_CLAIM_DENIED");};
const SHA=/^[a-f0-9]{40}$/;
export function assessPay54DeployerOidcClaims({claims,expectedSha}={}){
 if(!claims||typeof claims!=="object"||
    !SHA.test(expectedSha??"") ||
    claims.iss!=="https://token.actions.githubusercontent.com" ||
    claims.aud!=="pay54:staging-release" ||
    claims.repository!=="demiladeolawoye/PAY54_v8.0_SmartWallet" ||
    !/^[1-9][0-9]{3,20}$/.test(String(claims.repository_id??""))||
    claims.ref!=="refs/heads/project-titan" ||
    claims.sha!==expectedSha ||
    claims.sub!=="repo:demiladeolawoye/PAY54_v8.0_SmartWallet:environment:pay54-staging"||
    typeof claims.job_workflow_ref!=="string" ||
    !claims.job_workflow_ref.startsWith(
      "demiladeolawoye/PAY54_v8.0_SmartWallet/.github/workflows/pay54-staging-deploy.yml@refs/heads/project-titan"))deny();
 return Object.freeze({
  schema:"pay54.staging-deployer-oidc-claim-source.v1",
  sourceSha:expectedSha,
  expectedIdentityClaimsMatched:true,
  jwtSignatureVerified:false,
  issuerJwksIndependentlyVerified:false,
  actualCloudWorkloadBindingInspected:false,
  cloudTokenExchangeAuthorised:false,
  stagingDeploymentAuthorised:false
 });
}
