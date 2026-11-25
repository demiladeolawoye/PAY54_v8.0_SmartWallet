"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 assessCanonicalWriterEvidence as assess,
 PAY54_CANONICAL_PROCEDURES as procedures,
 PAY54_CANONICAL_ADMISSION_REQUIREMENTS as required
} from "../governance/pay54-canonical-financial-writer-admission.mjs";
const f=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const reserve=f("../db/migrations/003_wallet_reservation.sql");
const lifecycle=f("../db/migrations/004_reservation_lifecycle.sql");
const denial=f("../db/tests/batch56/001_canonical_writer_admission_denial.sql");
const workflow=f("../../.github/workflows/pay54-batch22-postgres-rls-integration.yml");
test("reviewed canonical function names are present in source",()=>{
 assert.equal(procedures.length,3);
 for(const name of procedures){
  const declaration=new RegExp("CREATE\\s+(?:OR\\s+REPLACE\\s+)?FUNCTION\\s+"+
   name.replaceAll(".","\\.")+"\\s*\\(","i");
  assert.ok(declaration.test(reserve+"\n"+lifecycle),name);
  assert.ok(denial.includes(name),name);
 }
});
test("read-only disposable admission is after forward and before rollback",()=>{
 assert.ok(denial.includes("BEGIN READ ONLY;"));
 assert.ok(denial.includes("PAY54_B56_DISPOSABLE_FORWARD_ONLY"));
 assert.ok(denial.includes("PAY54_B56_CANONICAL_FINANCIAL_EXECUTION_EXPOSED"));
 assert.ok(denial.includes("PAY54_B56_FINANCIAL_DML_LEAK"));
 const forward=workflow.indexOf("backend/db/release/wallet-read-v1-forward-review.sql",workflow.indexOf("Apply and reverse reviewed wallet-v1"));
 const admission=workflow.indexOf("backend/db/tests/batch56/001_canonical_writer_admission_denial.sql");
 const rollback=workflow.indexOf("backend/db/release/wallet-read-v1-rollback-review.sql",forward);
 assert.ok(forward>=0 && admission>forward && rollback>admission);
});
test("empty evidence is blocked; no-self-certifying release",()=>{
 const result=assess({});
 assert.equal(result.status,"NO_GO");
 assert.deepEqual(result.missing,required);
 assert.equal(result.realMoneyExecutionAuthorised,false);
 assert.ok(Object.isFrozen(result));
});
test("malformed, negative and self-reported complete evidence never authorise",()=>{
 assert.throws(()=>assess(null),/EVIDENCE_OBJECT_REQUIRED/);
 assert.throws(()=>assess([]),/EVIDENCE_OBJECT_REQUIRED/);
 const record=Object.fromEntries(required.map(k=>[k,true]));
 const complete=assess(record);
 assert.equal(complete.status,"INDEPENDENT_EVIDENCE_AUDIT_REQUIRED");
 for(const key of ["canonicalFinancialWriterVerified","sourceMergeAuthorised",
 "realMoneyExecutionAuthorised","cloudSpendingAuthorised",
 "stagingAuthorised","productionAuthorised"])
  assert.equal(complete[key],false);
 record.concurrentRevocationAgainstMoneyCorrect=false;
 assert.ok(assess(record).unproven.includes("concurrentRevocationAgainstMoneyCorrect"));
 record.concurrentRevocationAgainstMoneyCorrect="true";
 assert.ok(assess(record).invalid.includes("concurrentRevocationAgainstMoneyCorrect"));
});
