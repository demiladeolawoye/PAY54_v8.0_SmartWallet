"use strict";

/**
 * PAY54 Batch 18 item 621 — bounded owner-supplied Pages evidence register.
 *
 * A structured checklist, NOT authentication of screenshots, GitHub settings,
 * public URL reachability, or confirmation that a deployment has been rolled
 * back. Never passes user-supplied claims into a release authoriser.
 */
const SHA=/^[a-f0-9]{40}$/i;
const SHA256=/^[a-f0-9]{64}$/i;
const INTEGER=/^[1-9][0-9]{0,19}$/;
const URL=/^https:\/\/github\.com\/demiladeolawoye\/PAY54_v8\.0_SmartWallet\/(?:actions\/runs\/[0-9]+|settings\/pages)(?:\?[^\s]*)?$/;
const SOURCES=new Set(["github_actions","branch"]);
const REVIEW_FIELDS=Object.freeze([
 "capturedAt","pagesSource","siteUrl","activeDeploymentCommit",
 "activeWorkflowRun","activeArtifactDigest","environmentRestrictions",
 "deployerIdentity","branchProtection","reviewerEvidenceLink"
]);
export function reviewPay54PagesOwnerEvidence(input={}){
 if(!input||typeof input!=="object"||Array.isArray(input)){
  throw new TypeError("PAY54_PAGES_OWNER_EVIDENCE_OBJECT_REQUIRED");
 }
 const findings=[];
 const hasField=name=>typeof input[name]==="string"&&
  input[name].trim().length>0&&input[name].length<=300;
 for(const name of REVIEW_FIELDS)if(!hasField(name))findings.push("MISSING_"+name.toUpperCase());
 if(hasField("capturedAt")&&
  (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(input.capturedAt)||
   !Number.isFinite(Date.parse(input.capturedAt)))){
  findings.push("CAPTURE_TIMESTAMP_INVALID");
 }
 if(hasField("pagesSource")&&!SOURCES.has(input.pagesSource)){
  findings.push("UNRECOGNISED_PAGES_SOURCE");
 }
 if(hasField("siteUrl")&&
  !/^https:\/\/demiladeolawoye\.github\.io\/PAY54_v8\.0_SmartWallet\/?(?:[?#][^\s]*)?$/i.test(input.siteUrl)){
  findings.push("SITE_URL_NOT_CANONICAL");
 }
 if(hasField("activeDeploymentCommit")&&!SHA.test(input.activeDeploymentCommit)){
  findings.push("ACTIVE_COMMIT_INVALID");
 }
 if(hasField("activeWorkflowRun")&&!INTEGER.test(input.activeWorkflowRun)){
  findings.push("ACTIVE_WORKFLOW_RUN_INVALID");
 }
 if(hasField("activeArtifactDigest")&&!SHA256.test(input.activeArtifactDigest)){
  findings.push("ACTIVE_ARTIFACT_DIGEST_INVALID");
 }
 if(hasField("reviewerEvidenceLink")&&!URL.test(input.reviewerEvidenceLink)){
  findings.push("OWNER_REVIEW_LINK_NOT_REPOSITORY_BOUND");
 }
 const reviewed=Object.freeze({
  schema:"pay54.pages-owner-evidence-register.v1",
  missingOrInvalid:Object.freeze([...new Set(findings)]),
  fieldsSupplied:REVIEW_FIELDS.filter(hasField).length,
  evidencePacketStructurallyComplete:findings.length===0,
  // Operator records alone never authenticate GitHub's actual state.
  evidenceIndependentlyAuthenticated:false,
  currentSiteContentInspected:false,
  activeArtifactIndependentlyAttested:false,
  credentialCompromiseAssessed:false,
  exposureIncidentClassified:false,
  publicationApproved:false,
  productionRelease:"BLOCKED"
 });
 return reviewed;
}
