"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessPay54GbpQuoteEvidence as assess} from
  "../governance/pay54-gbp-quote-evidence.mjs";

const valid = () => ({
 quoteReference:"GCP-2026-11-24-001", issuedOn:"2026-11-24",
 currency:"GBP", region:"europe-west2", databaseVersion:"PostgreSQL 16",
 edition:"Enterprise", machineType:"db-custom-2-8192",
 availability:"ZONAL_NO_HA", computeHours:80, ssdGiB:10,
 backupGiB:10, backupRetentionDays:7,
 computeGbp:10, storageGbp:2, backupGbp:1, networkGbp:3,
 operationsGbp:2, taxGbp:3.6, totalGbp:21.6,
 quoteEvidenceUrl:"https://cloud.google.com/products/calculator",
 operator:"Engineering owner", teardownDate:"2026-12-01",
 reviewer:"Independent Finance reviewer"
});
test("missing evidence never qualifies for review or spend",()=>{
 const result=assess({});
 assert.equal(result.completeForIndependentReview,false);
 assert.ok(result.missing.includes("totalGbp"));
 assert.equal(result.spendingAuthorized,false);
 assert.equal(result.productionAuthorized,false);
 assert.ok(Object.isFrozen(result));
});
test("complete syntactic evidence only qualifies for human review",()=>{
 const result=assess(valid());
 assert.equal(result.status,"INDEPENDENT_REVIEW_REQUIRED");
 assert.equal(result.completeForIndependentReview,true);
 for(const key of ["externallyVerified","financeApproved","spendingAuthorized",
  "cloudProvisioningAuthorized","stagingDeploymentAuthorized","productionAuthorized"]) {
   assert.equal(result[key],false);
 }
});
test("rejects missing networking and tax line items",()=>{
 const value=valid();
 delete value.networkGbp;
 delete value.taxGbp;
 assert.deepEqual(assess(value).missing.filter(x=>x.endsWith("Gbp")),
  ["networkGbp","taxGbp"]);
});
test("rejects inconsistent total, currencies, region and non-finite amounts",()=>{
 for(const mutation of [
  {totalGbp:10}, {currency:"USD"}, {region:"us-central1"},
  {networkGbp:NaN}, {computeGbp:-1}, {computeHours:1000},
  {teardownDate:"2026-11-01"}, {taxGbp:1.001}
 ]) {
  const result=assess({...valid(),...mutation});
  assert.equal(result.completeForIndependentReview,false);
  assert.ok(result.invalid.length>0);
 }
});
test("rejects invalid objects and unsafe evidence URLs",()=>{
 assert.throws(()=>assess(null),/OBJECT_REQUIRED/);
 assert.throws(()=>assess([]),/OBJECT_REQUIRED/);
 assert.ok(assess({...valid(),quoteEvidenceUrl:"file:///quote"}).invalid.includes("quoteEvidenceUrl"));
});
