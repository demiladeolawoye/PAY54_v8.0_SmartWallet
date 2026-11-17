"use strict";
/** Batch27/1070 — safe GitHub Pages build/deployment response inventory. */
const deny=()=>{throw new Error("PAY54_PAGES_DEPLOYMENT_OBSERVATION_DENIED");};
const SHA=/^[a-f0-9]{40}$/;
const ID=/^[1-9][0-9]{0,18}$/;
const STATES=new Set(["created","queued","in_progress","success","failure","error","inactive"]);
export function inspectPay54PagesDeploymentObservation({
 repositoryFullName,expectedSourceSha,
 response,reviewedAtMs
}={}){
 if(repositoryFullName!=="demiladeolawoye/PAY54_v8.0_SmartWallet" ||
    !SHA.test(expectedSourceSha??"") ||
    !Number.isSafeInteger(reviewedAtMs)||reviewedAtMs<=0 ||
    !response || typeof response!=="object" ||
    !ID.test(String(response.id??"")) ||
    !STATES.has(response.status) ||
    !SHA.test(response.sha??"") ||
    response.sha!==expectedSourceSha ||
    typeof response.environment!=="string" ||
    !["github-pages","pay54-staging-pages"].includes(response.environment))deny();
 return Object.freeze({
  schema:"pay54.pages-deployment-api-observation.v1",
  deploymentId:String(response.id),
  sourceSha:response.sha,
  providerReportedStatus:response.status,
  reviewedAtMs,
  responseProvenanceIndependentlyAuthenticated:false,
  artifactBytesRetrieved:false,
  activeDeploymentVerified:false,
  publicSourceExposureProven:false,
  productionDeploymentAuthorised:false
 });
}
