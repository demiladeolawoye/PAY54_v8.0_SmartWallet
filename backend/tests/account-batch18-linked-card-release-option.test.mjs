"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessPay54LinkedCardReleaseOption}
 from "../governance/pay54-batch18-linked-card-release-option.mjs";
const base=()=>({
 option:"FEATURE_GATED_PUBLIC_PREVIEW",
 reviewedCommitSha:"b".repeat(40),
 providerContractSigned:true,
 partnerComplianceApproved:true,
 backendAuthorizationEnforced:true,
 fundingIdempotencyVerified:true,
 reconciliationAcceptancePassed:true,
 fullFundingRegressionPassed:true,
 frontendCapabilityGateTested:true,
 independentSecurityReview:true,
 rollbackVerified:true,
 linkedCardExecutionDisabledOnServer:true,
 otherFundingSourcesRegressionPassed:true
});
test("626: even a complete feature-gated evidence packet is not deployment approval",()=>{
 const result=assessPay54LinkedCardReleaseOption(base());
 assert.equal(result.evidencePacketComplete,true);
 assert.equal(result.evidenceIndependentlyAuthenticated,false);
 assert.equal(result.currentPaymentsEnabled,false);
 assert.equal(result.providerOrFeatureChangeApplied,false);
 assert.equal(result.siteDeploymentApproved,false);
 assert.equal(result.productionRelease,"BLOCKED");
});
test("626: frontend hiding without backend refusal and other funding regression is denied",()=>{
 const packet=base();
 packet.linkedCardExecutionDisabledOnServer=false;
 packet.otherFundingSourcesRegressionPassed=false;
 const result=assessPay54LinkedCardReleaseOption(packet);
 assert.equal(result.evidencePacketComplete,false);
 assert.ok(result.missingEvidence.includes("SERVER_SIDE_LINKED_CARD_DISABLE_UNVERIFIED"));
 assert.ok(result.missingEvidence.includes("OTHER_FUNDING_SOURCES_REGRESSION_UNVERIFIED"));
});
test("626: approved production provider choice needs independent provider identity and adapter review",()=>{
 const packet=base();packet.option="APPROVED_PROVIDER";
 const result=assessPay54LinkedCardReleaseOption(packet);
 assert.ok(result.missingEvidence.includes("PROVIDER_IDENTITY_NOT_VERIFIED"));
 assert.ok(result.missingEvidence.includes("PRODUCTION_PROVIDER_ADAPTER_NOT_REVIEWED"));
});
test("626: unknown options, missing reviewed SHA and nonobject inputs fail closed",()=>{
 const packet=base();
 packet.option="USE_MOCK_PROVIDER";
 packet.reviewedCommitSha="branch-name";
 const r=assessPay54LinkedCardReleaseOption(packet);
 assert.ok(r.missingEvidence.includes("APPROVED_OPTION_MISSING"));
 assert.ok(r.missingEvidence.includes("REVIEWED_SOURCE_SHA_MISSING"));
 assert.throws(()=>assessPay54LinkedCardReleaseOption(null),/OBJECT_REQUIRED/);
});
