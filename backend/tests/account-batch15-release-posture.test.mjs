"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessPay54Batch15ReleasePosture}
 from "../governance/pay54-batch15-release-posture.mjs";
const purported=()=>({
 publicationAttestation:{sourceToStageMatches:true},
 artifactRisk:{artifactBoundaryStatus:"FAILED",riskCleared:false},
 uploadPlan:{uploadPlanStructurallySafe:true},
 financialLaunch:{suppliedMetadataComplete:true,
  regulatedStatusIndependentlyVerified:false},
 accountCutover:{metadataComplete:true,customerTenantIsolationProven:false},
 rollbackEvidence:{evidenceMetadataComplete:true,
  actualRollbackRehearsalIndependentlyObserved:false}
});
test("510: confirmed Pages packaging P0 cannot be masked by green source checks",()=>{
 const r=assessPay54Batch15ReleasePosture(purported());
 assert.ok(r.unmetGates.includes("NO_KNOWN_PAGES_PACKAGING_FAILURE"));
 assert.ok(r.unmetGates.includes("FINANCIAL_LAUNCH"));
 assert.equal(r.productionDeploymentPermitted,false);
 assert.equal(r.realMoneyModeEnabled,false);
 assert.equal(r.productionRelease,"BLOCKED");
});
test("510: missing evidence for any gate fails closed",()=>{
 const r=assessPay54Batch15ReleasePosture({});
 assert.equal(r.unmetGates.length,6);
 assert.equal(r.releaseAuthorised,false);
});
test("510: even forged complete metadata cannot produce a release token",()=>{
 const v=purported();
 v.artifactRisk={artifactBoundaryStatus:"SOURCE_POLICY_PASSED",riskCleared:true};
 v.financialLaunch.regulatedStatusIndependentlyVerified=true;
 v.accountCutover.customerTenantIsolationProven=true;
 v.rollbackEvidence.actualRollbackRehearsalIndependentlyObserved=true;
 const r=assessPay54Batch15ReleasePosture(v);
 assert.equal(r.gateMetadataComplete,true);
 assert.equal(r.actualProductionEvidenceVerified,false);
 assert.equal(r.releaseAuthorised,false);
 assert.equal(r.productionDeploymentPermitted,false);
 assert.equal(r.accountSwitchEnabled,false);
});
test("510: Pages package marked source-safe without clearance is still blocked",()=>{
 const v=purported();
 v.artifactRisk={artifactBoundaryStatus:"SOURCE_POLICY_PASSED",riskCleared:false};
 const r=assessPay54Batch15ReleasePosture(v);
 assert.ok(r.unmetGates.includes("NO_KNOWN_PAGES_PACKAGING_FAILURE"));
});
