"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {
 assessBatch10ReleaseBoundary,assessCurrentBatch10ReleaseBoundary
} from "../governance/account-batch10-release-boundary.mjs";

const safe=Object.freeze({
 passed:true,liveCredentialAttested:false,
 customerDataAccessEnabled:false,financialExecutionEnabled:false,
 productionRelease:"BLOCKED"
});
test("256: source-only Batch 10 never activates staging or production",()=>{
 const result=assessCurrentBatch10ReleaseBoundary();
 assert.equal(result.sourceSecurityChecksPassed,true);
 assert.equal(result.deploymentApproved,false);
 assert.equal(result.pagesPublicationApproved,false);
 assert.equal(result.stagingRelease,"BLOCKED");
 assert.equal(result.productionRelease,"BLOCKED");
 assert.equal(result.cloudProvisioningEnabled,false);
 assert.equal(result.liveCustomerSelectEnabled,false);
 assert.equal(result.paymentExecutionEnabled,false);
 assert.equal(result.independentEvidenceVerified,false);
 assert.ok(Object.isFrozen(result));
});
test("256: forged or positive live credentials break source-only gate",()=>{
 for(const patch of [
  {passed:false},{liveCredentialAttested:true},
  {customerDataAccessEnabled:true},{financialExecutionEnabled:true},
  {productionRelease:"ENABLED"}
 ]){
  assert.throws(()=>assessBatch10ReleaseBoundary({
   sourceAudit:{...safe,...patch}
  }),/BATCH10_RELEASE_SOURCE_UNTRUSTED/);
 }
});
test("256: self-asserted approvals do not create authority",()=>{
 const claims=Object.fromEntries([
  "independentDatabaseCredentialCustody","independentCustomerRlsReview",
  "durableAuditInfrastructure","independentPenetrationTest",
  "cloudNetworkEgressReview","regulatoryAndPartnerApproval",
  "founderSignedProductionRelease"
 ].map(k=>[k,true]));
 const outcome=assessBatch10ReleaseBoundary({
  sourceAudit:safe,approvedReleaseEvidence:claims
 });
 assert.equal(outcome.evidenceClaimsSubmitted,7);
 assert.equal(outcome.independentEvidenceVerified,false);
 assert.equal(outcome.deploymentApproved,false);
 assert.equal(outcome.paymentExecutionEnabled,false);
 assert.equal(outcome.productionRelease,"BLOCKED");
});
