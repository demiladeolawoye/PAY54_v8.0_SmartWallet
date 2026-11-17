"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {reconcilePay54OperationalBlockers as reconcile,
 assessPay54OperationalBlockersInCheckout as actual}
 from "../governance/pay54-batch25-operational-blockers.mjs";

const inputs={
 stagingGate:{
  integrityPassed:true,release:"BLOCKED",deploymentAuthorized:false,
  provisioningAuthorized:false,financialExecutionAuthorized:false
 },
 rootRisk:{
  sourceRootPublicationBlocked:true,
  activePagesSourceVerified:false,
  remotePublishedArtifactInspected:false
 },
 cardWiring:{
  developmentProviderScriptPresent:true,
  productionCardFundingApproved:false
 },
 releaseWorkflowRisk:{
  pagesSettingsVerified:false,deployerCloudIamVerified:false,
  workflowCount:72
 }
};

test("982: real checkout reports Pages, linked-card and identity operational blockers",()=>{
 const result=actual();
 assert.equal(result.productionReleaseAuthorised,false);
 assert.equal(result.stagingReleaseAuthorised,false);
 assert.equal(result.sourceFindings.sourceRootPublicationBlocked,true);
 assert.equal(result.sourceFindings.linkedCardDevelopmentScriptPresent,true);
 assert.ok(result.blockerCount>=8);
 assert.ok(Object.isFrozen(result.blockers));
});
test("982: source checks cannot mutate or mark regulated money as approved",()=>{
 const result=reconcile(inputs);
 assert.equal(result.blockerCount,8);
 assert.equal(result.stagingIntegrityChecksOnly,true);
 assert.equal(result.independentEvidenceRecordedByThisModule,false);
 assert.ok(result.blockers.every(x=>x.operationallyClosed===false));
 assert.ok(result.blockers.some(x=>x.id==="CR-CARD-01" &&
  x.unverified===true));
 assert.ok(Object.isFrozen(result.sourceFindings));
});
test("982: forged staging-gate approval invalidates entire reconciler",()=>{
 for(const changed of [
  {release:"APPROVED"},{deploymentAuthorized:true},
  {provisioningAuthorized:true},{financialExecutionAuthorized:true}
 ]){
  assert.throws(()=>reconcile({...inputs,
    stagingGate:{...inputs.stagingGate,...changed}
  }),/BATCH25_BLOCKER_REVIEW_DENIED/);
 }
});
