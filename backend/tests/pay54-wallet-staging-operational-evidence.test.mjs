"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {
 assessPay54WalletStagingOperationalEvidence as assess,
 renderPay54WalletStagingEvidenceMarkdown as render,
 assessPay54WalletStagingInCheckout as actual
} from "../governance/pay54-wallet-staging-operational-evidence.mjs";
const cloud=()=>({
 phase:"STG-04",scope:"OFFLINE_SOURCE_AUDIT",
 stagingRelease:"BLOCKED",cloudProvisioning:"DISABLED",
 financialExecution:"DISABLED",totals:{PASS:3,FAIL:0,NOT_VERIFIED:8},
 controls:[{id:"STG04-01",result:"PASS"}]
});
test("operational gates include genuine external evidence, never automatic approval",()=>{
 const r=assess({cloudReport:cloud()});
 assert.equal(r.totalOutstanding,8);
 assert.equal(r.stagingDeploymentAuthorised,false);
 assert.equal(r.productionAuthorised,false);
 assert.equal(r.independentCloudAttestation,false);
 assert.equal(r.providerSettlementVerified,false);
 assert.ok(Object.isFrozen(r));
 assert.ok(Object.isFrozen(r.gates));
 assert.ok(r.gates.every(x=>x.status==="AWAITING_EXTERNAL_INDEPENDENT_EVIDENCE"));
});
test("render release packet enumerates independent gates and NO-GO status",()=>{
 const d=render(assess({cloudReport:cloud()}));
 assert.match(d,/Staging NO-GO/);
 assert.match(d,/STG-WALLET-DB-01/);
 assert.match(d,/STG-WALLET-FUNDS-05/);
 assert.match(d,/STG-WALLET-UX-07/);
});
test("forged cloud release and missing source controls fail closed",()=>{
 for(const patch of [
  {stagingRelease:"APPROVED"},{cloudProvisioning:"ENABLED"},
  {financialExecution:"ENABLED"},{controls:null},{scope:"CLOUD_ATTESTATION"}
 ])assert.throws(()=>assess({cloudReport:{...cloud(),...patch}}),
   /PAY54_WALLET_STAGE_EVIDENCE_DENIED/);
});
test("forged source report cannot silently authorise staging",()=>{
 const d=assess({cloudReport:cloud()});
 assert.throws(()=>render({...d,stagingDeploymentAuthorised:true}),
   /PAY54_WALLET_STAGE_EVIDENCE_DENIED/);
});
test("reads original STG-04 source evidence rather than replacing it",()=>{
 const report=actual();
 assert.equal(report.stagingDeploymentAuthorised,false);
 assert.equal(report.totalOutstanding,8);
});
