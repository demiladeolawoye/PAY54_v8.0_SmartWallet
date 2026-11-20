"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54SanctionsHoldEvidence as inspect}
 from "../governance/pay54-batch27-sanctions-hold-proof.mjs";
const x={caseReference:"pay54-aml-case-100",
 screeningStatus:"HOLD",manualReviewerSigned:false,
 releasedAfterReview:false};
test("1177: sanctions hold is release-blocking even when payouts are technically available",()=>{
 const r=inspect(x);
 assert.equal(r.payoutHoldRequired,true);
 assert.equal(r.transactionExecutionAuthorised,false);
});
test("1177: claimed cleared status remains unverified and cannot execute",()=>{
 const r=inspect({...x,screeningStatus:"CLEARED",
  manualReviewerSigned:true,releasedAfterReview:true});
 assert.equal(r.manualReleasePrerequisiteClaimed,true);
 assert.equal(r.complianceOfficerSignatureVerified,false);
 assert.equal(r.transactionExecutionAuthorised,false);
});
