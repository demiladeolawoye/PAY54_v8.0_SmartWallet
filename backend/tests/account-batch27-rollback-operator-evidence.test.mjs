"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54RollbackOperatorEvidence as inspect}
 from "../governance/pay54-batch27-rollback-operator-evidence.mjs";
const r={beforeSha:"a".repeat(40),restoredSha:"b".repeat(40),
 observedAtMs:1800000000000,releaseTicket:"PAY54-CHG-2026",
 reviewerCount:2};
test("1135: rollback operator claim is not independent public proof",()=>{
 const x=inspect(r);
 assert.equal(x.restoredPublicArtifactIndependentlyHashed,false);
 assert.equal(x.productionReleaseAuthorised,false);
});
test("1135: same SHA, one reviewer, missing change ticket refused",()=>{
 for(const x of [{restoredSha:r.beforeSha},
  {reviewerCount:1},{releaseTicket:"none"}])
 assert.throws(()=>inspect({...r,...x}),
 /ROLLBACK_OPERATOR_EVIDENCE_DENIED/);
});
