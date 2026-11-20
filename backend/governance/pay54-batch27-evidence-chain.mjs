"use strict";
/**
 * Batch27 / 1087 — release observations require independent source provenance.
 * Never infer live hosting state from structurally valid imported JSON.
 */
import {normalisePay54PagesSettingsEvidence}
 from "./pay54-batch27-pages-settings-observation.mjs";
import {inspectPay54PagesDeploymentObservation}
 from "./pay54-batch27-pages-deployment-observation.mjs";
const deny=()=>{throw new Error("PAY54_OPERATIONAL_EVIDENCE_CHAIN_DENIED");};
export function reviewPay54PagesEvidenceChain({
 settingsInput,deploymentInput,
 inspectSettings=normalisePay54PagesSettingsEvidence,
 inspectDeployment=inspectPay54PagesDeploymentObservation
}={}){
 if(typeof inspectSettings!=="function"||
    typeof inspectDeployment!=="function")deny();
 let settings,deployment;
 try{
  settings=inspectSettings(settingsInput);
  deployment=inspectDeployment(deploymentInput);
 }catch{deny();}
 if(settings?.schema!=="pay54.pages-settings-api-observation.v1"||
    deployment?.schema!=="pay54.pages-deployment-api-observation.v1"||
    settings.repositoryFullName!==deploymentInput?.repositoryFullName ||
    settings.sourceRootRisk===undefined ||
    deployment.responseProvenanceIndependentlyAuthenticated!==false ||
    settings.productionDeploymentAuthorised!==false ||
    deployment.productionDeploymentAuthorised!==false)deny();
 return Object.freeze({
  schema:"pay54.pages-api-record-review.v1",
  repositoryFullName:settings.repositoryFullName,
  deploymentId:deployment.deploymentId,
  deploymentSourceSha:deployment.sourceSha,
  sourceRootRisk:settings.sourceRootRisk,
  settingsAndDeploymentRecordsStructurallyValid:true,
  independentApiAuthenticationRequired:true,
  activePublicBytesStillUnverified:true,
  pagesExposureIncidentNotClosed:true,
  deploymentAuthorised:false
 });
}
