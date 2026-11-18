"use strict";

/**
 * PAY54 item 450 — read-only Pages settings evidence policy.
 * This module validates supplied settings metadata only and cannot query
 * GitHub or change deployment configuration. Release stays BLOCKED.
 */
const SHA=/^[a-f0-9]{40}$/;
const HOST="demiladeolawoye.github.io";
const REPOSITORY="demiladeolawoye/PAY54_v8.0_SmartWallet";

export function assessPay54PagesSettingsSnapshot(snapshot){
 if(!snapshot||typeof snapshot!=="object"||Array.isArray(snapshot)){
  throw new TypeError("PAY54_PAGES_SETTINGS_SNAPSHOT_REQUIRED");
 }
 const failures=[];
 if(snapshot.repository!==REPOSITORY){
  failures.push("UNEXPECTED_REPOSITORY");
 }
 if(!SHA.test(snapshot.commitSha??"")){
  failures.push("UNVERIFIED_SOURCE_COMMIT");
 }
 if(snapshot.buildType!=="workflow"){
  failures.push("PAGES_ACTIONS_SOURCE_REQUIRED");
 }
 if(snapshot.publicationRoot!=="/site"){
  failures.push("RESTRICTED_PUBLICATION_ROOT_UNVERIFIED");
 }
 if(snapshot.deployEnvironment!=="github-pages"){
  failures.push("PAGES_ENVIRONMENT_UNVERIFIED");
 }
 if(snapshot.requireEnvironmentReviewers!==true){
  failures.push("ENVIRONMENT_REVIEWERS_MISSING");
 }
 if(snapshot.httpsEnforced!==true){
  failures.push("HTTPS_ENFORCEMENT_MISSING");
 }
 if(snapshot.hostname!==HOST){
  failures.push("UNEXPECTED_PAGES_HOST");
 }
 if(snapshot.originEvidenceIndependentlyCollected!==true){
  failures.push("INDEPENDENT_SETTINGS_EVIDENCE_MISSING");
 }
 return Object.freeze({
  schema:"pay54.pages-settings-source-review.v1",
  failures:Object.freeze(failures),
  declaredSettingsPolicySatisfied:failures.length===0,
  liveGithubSettingsIndependentlyVerified:false,
  releasedArtifactInspected:false,
  releaseAuthorised:false,
  productionRelease:"BLOCKED"
 });
}
