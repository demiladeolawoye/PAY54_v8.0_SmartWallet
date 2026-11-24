"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {evaluatePay54WriterEvidence as check,PAY54_WRITER_ADMISSION_FIELDS as fields} from "../governance/pay54-financial-writer-evidence-gate.mjs";
test("blank evidence fails closed",()=>{
 const r=check({});
 assert.equal(r.selfReportedComplete,false);
 assert.deepEqual(r.missing,fields);
 assert.equal(r.managedStagingAuthorized,false);
});
test("self reported all true is still not external verification",()=>{
 const obj=Object.fromEntries(fields.map(k=>[k,true]));
 Object.assign(obj,{postgresVersion:"16",environment:"DISPOSABLE_CI",connectionIdentity:"ci-only",effectiveWriterRole:"scoped-writer",auditRunId:"audit-001"});
 const r=check(obj);
 assert.equal(r.selfReportedComplete,true);
 assert.equal(r.status,"HUMAN_REVIEW_REQUIRED");
 for(const key of ["evidenceAuthenticityVerified","actualManagedConnectionVerified","realPartnerSettlementVerified","cloudSpendingAuthorized","managedStagingAuthorized","productionAuthorized"])assert.equal(r[key],false);
});
test("false result and invalid fields do not pass",()=>{
 const obj=Object.fromEntries(fields.map(k=>[k,true]));
 Object.assign(obj,{postgresVersion:"15",environment:"STAGING",connectionIdentity:"",effectiveWriterRole:"x",auditRunId:"x",postMigrationCaptureVerified:false});
 const r=check(obj);
 assert.equal(r.selfReportedComplete,false);
 assert.ok(r.unproven.includes("postMigrationCaptureVerified"));
 assert.ok(r.invalid.includes("environment"));
 assert.ok(r.invalid.includes("postgresVersion"));
});
test("rejects malformed evidence",()=>{
 assert.throws(()=>check(null),/OBJECT_REQUIRED/);
 assert.throws(()=>check([]),/OBJECT_REQUIRED/);
});
