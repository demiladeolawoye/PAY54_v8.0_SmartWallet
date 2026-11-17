"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54IndependentReviewerSeparation as inspect}
 from "../governance/pay54-batch27-signed-reviewer-separation.mjs";
const x={sourceAuthorId:"engineering_author",
 securityReviewerId:"security_reviewer",dbaReviewerId:"database_reviewer",
 releaseReviewerId:"release_manager",complianceReviewerId:"compliance_officer"};
test("1141: separate source and release staff do not imply cryptographic approval",()=>{
 const r=inspect(x);
 assert.equal(r.distinctOfficeIdentities,5);
 assert.equal(r.actualProviderIdentityVerified,false);
 assert.equal(r.productionReleaseAuthorised,false);
});
test("1141: self-approvals and missing Compliance reviewer refused",()=>{
 assert.throws(()=>inspect({...x,securityReviewerId:x.sourceAuthorId}),
 /SIGNED_REVIEWER_SEPARATION_DENIED/);
 assert.throws(()=>inspect({...x,complianceReviewerId:""}),
 /SIGNED_REVIEWER_SEPARATION_DENIED/);
});
