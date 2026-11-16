"use strict";
import {assessPay54StagingTrustSource} from "./pay54-staging-trust-source.mjs";
import {assessStagingProvisioningSafeguards} from "./stg05-provisioning-safeguards.mjs";
import {assessPay54PullRequestWorkflowTrust} from "./pay54-pr-workflow-trust-audit.mjs";
import {assessPay54ActionsDependencyInventory} from "./pay54-actions-dependency-audit.mjs";

/*
 * PAY54 Batch 11 item 305 — source-only operational reviewer assessment.
 * Composes existing validators, never duplicates authorisation policy.
 * Even full source confidence does not establish effective cloud controls,
 * Github environment protection, independently stored audit or legal approval.
 */
export function assessPay54StagingSourceReadiness({
  terraformSource,stagingWorkflowSource,workflowInventory
}={}){
 const trust=assessPay54StagingTrustSource({
  terraformSource,workflowSource:stagingWorkflowSource
 });
 const provisioning=assessStagingProvisioningSafeguards(terraformSource);
 const workflowTrust=assessPay54PullRequestWorkflowTrust({
  workflows:workflowInventory
 });
 const supplyChain=assessPay54ActionsDependencyInventory({
  workflows:workflowInventory
 });
 const controls=Object.freeze([
  Object.freeze({name:"STAGING_SOURCE_TRUST",passed:trust.sourceTrustPolicyPassed}),
  Object.freeze({name:"TERRAFORM_PROVISIONING_DENIAL",passed:provisioning.passed}),
  Object.freeze({name:"WORKFLOW_TRUST_HEURISTICS",passed:workflowTrust.sourceHeuristicsClear}),
  Object.freeze({name:"IMMUTABLE_EXTERNAL_ACTION_REFERENCES",
   passed:supplyChain.allExternalReferencesImmutable})
 ]);
 const open=Object.freeze([
  "GITHUB_BRANCH_AND_ENVIRONMENT_PROTECTION",
  "UPSTREAM_ACTION_PROVENANCE_REVIEW",
  "GOOGLE_CLOUD_PROJECT_IAM_ATTESTATION",
  "NETWORK_AND_EGRESS_RUNTIME_NEGATIVE_TEST",
  "CUSTOMER_DATABASE_AND_AUDIT_DURABILITY",
  "INDEPENDENT_REGULATORY_AND_PENETRATION_REVIEW",
  "FOUNDER_RELEASE_AUTHORISATION"
 ]);
 return Object.freeze({
  sourceChecks:controls,
  sourceReadyForIndependentReview:controls.every(x=>x.passed),
  workflowRiskCount:workflowTrust.highRiskWorkflowCount,
  mutableExternalActionCount:supplyChain.mutableExternalActionCount,
  openOperationalEvidence:open,
  cloudIdentityAttested:false,
  independentReviewComplete:false,
  stagingApproved:false,
  customerDataAccessEnabled:false,
  financialExecutionEnabled:false,
  cloudProvisioningEnabled:false,
  productionRelease:"BLOCKED"
 });
}
