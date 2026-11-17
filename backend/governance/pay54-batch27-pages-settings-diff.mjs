"use strict";
/** Batch27/1128 — detect risky Pages source changes across review snapshots. */
const deny=()=>{throw Error("PAY54_PAGES_SETTINGS_DIFF_DENIED");};
export function inspectPay54PagesSettingsChange({
 before,after
}={}){
 if(before?.schema!=="pay54.pages-settings-api-observation.v1" ||
    after?.schema!=="pay54.pages-settings-api-observation.v1" ||
    before.repositoryFullName!==after.repositoryFullName ||
    !Number.isSafeInteger(before.observedAtMs) ||
    !Number.isSafeInteger(after.observedAtMs) ||
    after.observedAtMs<=before.observedAtMs ||
    before.productionDeploymentAuthorised!==false ||
    after.productionDeploymentAuthorised!==false)deny();
 const changes=[];
 for(const field of ["buildType","sourceBranch",
  "sourceDirectory","customDomain"]){
  if(before[field]!==after[field])changes.push(field);
 }
 return Object.freeze({
  schema:"pay54.pages-settings-change-source-review.v1",
  changedFields:Object.freeze(changes),
  rootSourceNewlyEnabled:
   after.sourceRootRisk===true && before.sourceRootRisk!==true,
  settingsWereIndependentlyAuthenticated:false,
  publicArtifactRevalidatedAfterChange:false,
  deploymentAuthorised:false
 });
}
