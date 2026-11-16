"use strict";

/**
 * PAY54 item 644 — evidence classification of Pages overpublication.
 *
 * Distinguishes an old archive with internal content from actual current live
 * accessibility and independently reviewed sensitivity. No HTTP is performed,
 * no incident declared resolved and no automatic external notifications.
 */
const REACH=new Set(["UNVERIFIED","HTTP_STATUS_ONLY",
 "CONTENT_MATCH_CONFIRMED","SAMPLED_PATHS_UNREACHABLE"]);
const SENSITIVITY=new Set(["UNVERIFIED","PUBLIC_SOURCE_ONLY",
 "SENSITIVE_CREDENTIAL_OR_PERSONAL_DATA_CONFIRMED"]);
export function classifyPay54PagesExposure(input={}){
 if(!input||typeof input!=="object"||Array.isArray(input)){
  throw new TypeError("PAY54_PAGES_EXPOSURE_INPUT_REQUIRED");
 }
 const archivedSourceOverbroad=input.historicalArtifactOverbroad===true;
 const reachability=REACH.has(input.activePublicReachability)?
  input.activePublicReachability:"UNVERIFIED";
 const sensitivity=SENSITIVITY.has(input.contentSensitivity)?
  input.contentSensitivity:"UNVERIFIED";
 const findings=[];
 if(archivedSourceOverbroad)findings.push("HISTORICAL_PUBLICATION_PACKAGE_BOUNDARY_FAILED");
 if(reachability==="HTTP_STATUS_ONLY")findings.push("HTTP_STATUS_IS_NOT_CONTENT_PROOF");
 if(reachability==="SAMPLED_PATHS_UNREACHABLE")findings.push("SAMPLED_PATHS_DO_NOT_PROVE_SITE_SAFE");
 if(reachability==="CONTENT_MATCH_CONFIRMED"){
  if(input.currentDeploymentCommitIndependentlyConfirmed!==true){
   findings.push("LIVE_DEPLOYMENT_PROVENANCE_STILL_UNVERIFIED");
  }
  findings.push("MATCHED_INTERNAL_CONTENT_REQUIRES_SECURITY_INCIDENT_REVIEW");
 }
 if(sensitivity==="SENSITIVE_CREDENTIAL_OR_PERSONAL_DATA_CONFIRMED"){
  findings.push("PRIVATE_CONTENT_IMPACT_REQUIRES_INCIDENT_RESPONSE");
 }
 const currentContentExposed=reachability==="CONTENT_MATCH_CONFIRMED";
 const sensitiveLiveContentConfirmed=currentContentExposed&&
  sensitivity==="SENSITIVE_CREDENTIAL_OR_PERSONAL_DATA_CONFIRMED";
 return Object.freeze({
  schema:"pay54.pages-evidence-incident-classifier.v1",
  historicalPackageBoundaryFailed:archivedSourceOverbroad,
  sampledLiveContentMatchConfirmed:currentContentExposed,
  sensitiveLiveContentEvidenceConfirmed:sensitiveLiveContentConfirmed,
  severity:archivedSourceOverbroad||currentContentExposed?"P0_REVIEW":"SECURITY_REVIEW",
  findings:Object.freeze(findings),
  publicBreachDeclared:false,
  currentDeploymentVerified:input.currentDeploymentCommitIndependentlyConfirmed===true&&
   currentContentExposed,
  allPublicInternalPathsProvedSafe:false,
  liveContainmentExecuted:false,
  incidentClosureAuthorised:false,
  productionRelease:"BLOCKED"
 });
}
