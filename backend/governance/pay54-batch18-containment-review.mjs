"use strict";

/**
 * PAY54 item 646 — security incident containment decision support.
 * No network, no suspension, no deletion, no credential rotation. Security
 * and Founder must approve actual operational actions separately.
 */
import {classifyPay54PagesExposure}
 from "./pay54-batch18-exposure-classification.mjs";
export function planPay54PagesContainmentReview(input={}){
 const exposure=classifyPay54PagesExposure(input);
 const actions=[];
 if(exposure.historicalPackageBoundaryFailed){
  actions.push("PRESERVE_HISTORICAL_GITHUB_ACTIONS_AND_ARTIFACT_EVIDENCE");
  actions.push("INSPECT_ACTIVE_PAGES_SOURCE_AND_ACTUAL_PUBLIC_CONTENT");
 }
 if(exposure.sampledLiveContentMatchConfirmed){
  actions.push("SECURITY_REVIEW_TEMPORARY_PAGES_ACCESS_RESTRICTION");
  actions.push("IDENTIFY_EXACT_ACTIVE_DEPLOYMENT_AND_EXPOSED_PATH_SCOPE");
 }
 if(exposure.sensitiveLiveContentEvidenceConfirmed){
  actions.push("REVIEW_CREDENTIAL_ROTATION_AND_REGULATORY_NOTIFICATION_OBLIGATIONS");
  actions.push("INITIATE_INCIDENT_RESPONSE_UNDER_APPROVED_PLAYBOOK");
 }
 actions.push("REQUIRE_FOUNDER_SECURITY_RELEASE_APPROVAL_BEFORE_ANY_SITE_CHANGE");
 return Object.freeze({
  schema:"pay54.pages-containment-decision-support.v1",
  reviewActions:Object.freeze(actions),
  riskPriority:exposure.severity,
  publicBreachDeclared:false,
  activeSettingsRead:false,
  liveSiteSuspended:false,
  credentialsRotated:false,
  operationalActionApproved:false,
  productionRelease:"BLOCKED"
 });
}
