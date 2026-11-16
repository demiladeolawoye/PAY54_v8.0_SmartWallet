"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {
 PAY54_RELEASE_GATES,assessPay54ReleaseEvidence
} from "../governance/pay54-release-evidence-review.mjs";

const SHA="a".repeat(40);
const NOW=new Date("2026-11-16T20:00:00.000Z");
const evidence=()=>PAY54_RELEASE_GATES.map((gate,index)=>({
 gate,
 decision:"PASS",
 commitSha:SHA,
 evidenceId:"PAY54-EV-GATE-"+String(index).padStart(3,"0"),
 owner:"security-owner",
 reviewer:"independent-reviewer",
 reviewedAt:"2026-11-16T19:00:00.000Z"
}));
const assess=records=>assessPay54ReleaseEvidence({
 commitSha:SHA,evidence:records
},{now:NOW});

test("419: complete independently reviewed metadata cannot activate production",()=>{
 const result=assess(evidence());
 assert.equal(result.expectedGateCount,9);
 assert.equal(result.providedGateCount,9);
 assert.equal(result.evidenceMetadataComplete,true);
 assert.equal(result.evidenceAuthenticityVerified,false);
 assert.equal(result.releaseAuthorised,false);
 assert.equal(result.productionRelease,"BLOCKED");
 assert.ok(Object.isFrozen(result.findings));
});
test("419: missing, duplicate and unexpected gate records fail closed",()=>{
 const incomplete=assess(evidence().slice(1));
 assert.equal(incomplete.evidenceMetadataComplete,false);
 assert.equal(incomplete.findings[0].reason,"MISSING_EVIDENCE");
 const duplicate=assess([...evidence(),evidence()[0]]);
 assert.ok(duplicate.findings.some(x=>x.reason==="DUPLICATE_GATE"));
 const unexpected=assess([...evidence(),{gate:"FAKE",decision:"PASS"}]);
 assert.ok(unexpected.findings.some(x=>x.reason==="UNEXPECTED_GATE"));
});
test("419: stale, future and forged reviews are rejected",()=>{
 const candidates=[
  {...evidence()[0],reviewedAt:"2026-10-01T00:00:00Z"},
  {...evidence()[0],reviewedAt:"2026-11-17T00:00:00Z"},
  {...evidence()[0],owner:"same",reviewer:"same"},
  {...evidence()[0],evidenceId:"foo"},
  {...evidence()[0],commitSha:"b".repeat(40)}
 ];
 for(const candidate of candidates){
  const records=evidence();records[0]=candidate;
  assert.equal(assess(records).evidenceMetadataComplete,false);
 }
});
test("419: PASS is not inferred from unknown, unsupported or failed decisions",()=>{
 for(const decision of ["PENDING","UNKNOWN","FAIL",null]){
  const records=evidence();records[2].decision=decision;
  assert.ok(assess(records).findings.some(x=>
   x.gate==="PUBLIC_REACHABILITY"&&x.reason==="NOT_APPROVED"));
 }
});
test("419: invalid commit and unsafe input fail closed",()=>{
 assert.throws(()=>assessPay54ReleaseEvidence(null),/INPUT_REQUIRED/);
 const result=assessPay54ReleaseEvidence({commitSha:"invalid",evidence:evidence()},{now:NOW});
 assert.equal(result.evidenceMetadataComplete,false);
 assert.ok(result.findings.some(x=>x.reason==="INVALID_COMMIT"));
});
