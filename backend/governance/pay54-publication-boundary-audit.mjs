"use strict";

import {assessPay54PagesPublicationEvidence} from "./pay54-pages-publication-evidence.mjs";

/*
 * PAY54 Batch 11 / item 271 — offline publication boundary inventory.
 * Read-only code review: repository source cannot establish GitHub Pages
 * settings, branch-protection rules or the contents actually served by Pages.
 * A successful auto Pages run must remain a tracked release governance risk.
 */
const SHA=/^[0-9a-f]{40}$/;
const WORKFLOW_PATH=/^\.github\/workflows\/[a-z0-9][a-z0-9._-]*\.ya?ml$/;
const RESERVED=new Set(["main","master","project-titan","production"]);

export function assessPay54PublicationBoundary({
  branch,headSha,pagesRunId,pagesConclusion,
  workflowInventory,releaseApprovalVerified=false
}={}){
  if(branch!=="project-titan"||!SHA.test(headSha??"")||
     !Array.isArray(workflowInventory)||workflowInventory.length>200||
     workflowInventory.some(path=>typeof path!=="string"||
       !WORKFLOW_PATH.test(path))||
     new Set(workflowInventory).size!==workflowInventory.length){
    throw new Error("PAY54_PUBLICATION_INVENTORY_UNTRUSTED");
  }

  const publication=assessPay54PagesPublicationEvidence({
    branch,headSha,runId:pagesRunId,
    workflow:"pages build and deployment",
    conclusion:pagesConclusion
  });

  const sourceWorkflows=Object.freeze([...workflowInventory].sort());
  const explicitPagesWorkflow=sourceWorkflows.some(path=>
    /(?:^|[-_.])pages(?:[-_.]|\.ya?ml$)/i.test(path)
  );
  return Object.freeze({
    repositoryBranch:branch,
    sourceRevision:headSha,
    workflowInventory:sourceWorkflows,
    explicitPagesWorkflowFound:explicitPagesWorkflow,
    githubManagedPagesMayBeConfigured:!explicitPagesWorkflow,
    pagesWorkflowSucceeded:publication.publicationMayHaveOccurred,
    observedPagesRunId:publication.runId,
    pagesSourceVerified:false,
    publishedArtefactsVerified:false,
    branchProtectionVerified:false,
    independentlyVerifiedReleaseApproval:false,
    callerClaimedApproval:releaseApprovalVerified===true,
    adminSettingsReviewRequired:true,
    engineeringBranchPublicationRisk:publication.publicationMayHaveOccurred?
      "HIGH":"UNRESOLVED",
    deploymentApproved:false,
    cloudProvisioningEnabled:false,
    financialExecutionEnabled:false,
    productionRelease:"BLOCKED"
  });
}
