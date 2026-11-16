"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {planPay54PagesContainmentReview}
 from "../governance/pay54-batch18-containment-review.mjs";
test("647: historical archive defect warrants inspection without automatic suspension",()=>{
 const r=planPay54PagesContainmentReview({
  historicalArtifactOverbroad:true,
  activePublicReachability:"UNVERIFIED"
 });
 assert.ok(r.reviewActions.includes("INSPECT_ACTIVE_PAGES_SOURCE_AND_ACTUAL_PUBLIC_CONTENT"));
 assert.equal(r.liveSiteSuspended,false);
 assert.equal(r.credentialsRotated,false);
 assert.equal(r.operationalActionApproved,false);
});
test("647: confirmed sensitivity triggers incident team review but not autonomous credential actions",()=>{
 const r=planPay54PagesContainmentReview({
  historicalArtifactOverbroad:true,
  activePublicReachability:"CONTENT_MATCH_CONFIRMED",
  contentSensitivity:"SENSITIVE_CREDENTIAL_OR_PERSONAL_DATA_CONFIRMED",
  currentDeploymentCommitIndependentlyConfirmed:true
 });
 assert.ok(r.reviewActions.includes("INITIATE_INCIDENT_RESPONSE_UNDER_APPROVED_PLAYBOOK"));
 assert.ok(r.reviewActions.includes(
  "REVIEW_CREDENTIAL_ROTATION_AND_REGULATORY_NOTIFICATION_OBLIGATIONS"
 ));
 assert.equal(r.credentialsRotated,false);
 assert.equal(r.liveSiteSuspended,false);
 assert.equal(r.productionRelease,"BLOCKED");
});
test("647: absent evidence cannot imply an exposure or an approved deployment",()=>{
 const r=planPay54PagesContainmentReview({});
 assert.equal(r.publicBreachDeclared,false);
 assert.equal(r.activeSettingsRead,false);
 assert.equal(r.operationalActionApproved,false);
 assert.equal(r.productionRelease,"BLOCKED");
});
