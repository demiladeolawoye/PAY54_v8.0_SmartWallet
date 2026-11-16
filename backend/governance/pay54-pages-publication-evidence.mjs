"use strict";

/*
 * PAY54 Batch 11 item 268: read-only GitHub Pages publication evidence policy.
 * This never calls GitHub, modifies Pages settings, enables hosting, or
 * approves a release. A GitHub Actions success is NOT proof that the published
 * content or repository settings have been independently inspected.
 */
const SHA=/^[a-f0-9]{40}$/;
const RUN=/^[1-9][0-9]{0,19}$/;

export function assessPay54PagesPublicationEvidence({
 branch,headSha,runId,workflow,conclusion,
 sourceConfigurationReviewed=false,
 publishedContentReviewed=false,
 founderApproved=false
}={}){
 if(branch!=="project-titan" || !SHA.test(headSha??"") ||
    !RUN.test(String(runId??"")) ||
    workflow!=="pages build and deployment" ||
    !["success","failure","cancelled","skipped","pending"].includes(conclusion)){
  throw new Error("PAY54_PAGES_EVIDENCE_UNTRUSTED");
 }
 // No self-attested reviewer booleans can authorise hosting deployment.
 const observed=conclusion==="success";
 return Object.freeze({
  branch,headSha,runId:String(runId),
  existingWorkflowObserved:true,
  publicationMayHaveOccurred:observed,
  repositoryPagesSettingsVerified:false,
  publishedContentIndependentlyVerified:false,
  founderApprovalIndependentlyVerified:false,
  sourceReviewClaimed:sourceConfigurationReviewed===true,
  contentReviewClaimed:publishedContentReviewed===true,
  founderApprovalClaimed:founderApproved===true,
  engineeringBranchPublicationRisk:observed?"HIGH":"UNRESOLVED",
  publicationApproved:false,
  deploymentApproved:false,
  productionRelease:"BLOCKED",
  financialExecutionEnabled:false
 });
}
