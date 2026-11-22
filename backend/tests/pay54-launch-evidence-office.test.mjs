"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {
 buildPay54LaunchEvidenceRegister as build,
 renderPay54LaunchEvidenceMarkdown as render,
 createPay54LaunchEvidenceReportInCheckout as actual
} from "../governance/pay54-launch-evidence-office.mjs";
const IDs=["CR-PAGES-01","CR-CARD-01","CR-DEPLOY-01","CR-IDENTITY-01","CR-DB-01","CR-RATE-01","CR-FINTECH-01","CR-QA-01"];
const fixture=()=>({
 schema:"pay54.batch25-cto-operational-blocker-register.v1",
 productionReleaseAuthorised:false,stagingReleaseAuthorised:false,
 blockers:IDs.map((id,i)=>({id,priority:i===7?"P1":"P0",
  title:id+" pending verification",unverified:true,
  operationallyClosed:false}))
});
test("eight canonical launch blockers map to distinct owners/evidence",()=>{
 const report=build(fixture());
 assert.equal(report.openBlockerCount,8);
 assert.equal(report.p0Count,7);assert.equal(report.p1Count,1);
 assert.deepEqual(report.blockers.map(x=>x.id),IDs);
 assert.ok(report.blockers.every(x=>x.owner&&x.nextAction&&x.acceptanceEvidence));
 assert.ok(report.blockers.every(x=>!x.independentlyClosed));
 assert.equal(report.productionAuthorised,false);
 assert.equal(report.persistentStagingAuthorised,false);
 assert.ok(Object.isFrozen(report));
 assert.ok(Object.isFrozen(report.blockers));
 assert.ok(Object.isFrozen(report.blockers[0]));
});
test("rendered Markdown is actionable and never falsely approves launch",()=>{
 const md=render(build(fixture()));
 for(const id of IDs)assert.ok(md.includes(id));
 assert.match(md,/PRODUCTION NO-GO/);
 assert.match(md,/7 P0, 1 P1/);
 assert.match(md,/provider contracts/);
});
test("real repository audit yields an evidence register without closing blockers",()=>{
 const report=actual();
 assert.equal(report.openBlockerCount,8);
 assert.ok(report.blockers.every(x=>x.status==="BLOCKED_PENDING_INDEPENDENT_EVIDENCE"));
 assert.equal(report.independentlyVerified,false);
});
test("forged release approval and wrong schema fail closed",()=>{
 for(const patch of [{productionReleaseAuthorised:true},
   {stagingReleaseAuthorised:true},{schema:"wrong"},
   {blockers:fixture().blockers.slice(0,7)},
   {blockers:[...fixture().blockers.slice(0,7),fixture().blockers[0]]},
   {blockers:fixture().blockers.map((x,i)=>i===1?{...x,operationallyClosed:true}:x)}]){
  assert.throws(()=>build({...fixture(),...patch}),
   /PAY54_LAUNCH_EVIDENCE_REGISTER_DENIED/);
 }
});
test("cannot render an externally forged release-approved report",()=>{
 const source=build(fixture());
 assert.throws(()=>render({...source,productionAuthorised:true}),
  /PAY54_LAUNCH_EVIDENCE_REGISTER_DENIED/);
});
