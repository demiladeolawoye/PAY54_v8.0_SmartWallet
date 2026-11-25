"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const matrix=JSON.parse(read("../governance/pay54-batch57-canonical-writer-design.json"));
const sql=read("../db/tests/batch57/001_canonical_writer_rls_compatibility.sql");
const ci=read("../../.github/workflows/pay54-batch22-postgres-rls-integration.yml");
const res=read("../db/migrations/003_wallet_reservation.sql");
const life=read("../db/migrations/004_reservation_lifecycle.sql");
test("canonical permissions contract is permanently design-only",()=>{
 assert.equal(matrix.schema,"pay54.canonical-writer-minimum-privilege-design.v1");
 assert.equal(matrix.status,"DESIGN_ONLY_NOT_APPLIED");
 for(const [k,v] of Object.entries(matrix.prohibitions))assert.equal(v,false,k);
 for(const [k,v] of Object.entries(matrix.evidenceStatus))assert.equal(v,false,k);
 assert.equal(matrix.principalBoundary.trustClientOwnerUuid,false);
 assert.equal(matrix.principalBoundary.requireAtomicFinancialTransaction,true);
});
test("all three canonical financial procedures are grounded in reviewed source",()=>{
 assert.match(res,/CREATE OR REPLACE FUNCTION pay54\.reserve_wallet_transfer\(/);
 assert.match(life,/CREATE FUNCTION pay54\.capture_reserved_wallet_transfer\(/);
 assert.match(life,/CREATE FUNCTION pay54\.release_reserved_wallet_transfer\(/);
 assert.equal(Object.keys(matrix.sourceFunctions).length,3);
 for(const x of Object.values(matrix.sourceFunctions))assert.ok(sql.includes(x),x);
});
test("proposed table verbs are explicit and contain no uncontrolled object",()=>{
 const allowed=new Set([
 "auth_sessions","account_contexts","account_memberships","personal_wallet_bindings",
 "currencies","wallets","ledger_accounts","ledger_journals","ledger_entries",
 "financial_operations","idempotency_records","balance_reservations",
 "provider_attempts","outbox_events"
 ]);
 for(const [action,verbs] of Object.entries(matrix.unapprovedCandidateOperations)){
  assert.ok(["reserve","capture","release"].includes(action));
  for(const [verb,tables] of Object.entries(verbs)){
   assert.ok(["select","insert","update"].includes(verb),verb);
   assert.ok(Array.isArray(tables)&&tables.length>0);
   assert.equal(tables.length,new Set(tables).size);
   for(const table of tables)assert.ok(allowed.has(table),table);
  }
 }
});
test("real PG16 read-only effective-role proof is mandatory inside forward RLS window",()=>{
 for(const x of ["BEGIN READ ONLY;","SET LOCAL ROLE pay54_ledger_executor_role",
 "PAY54_B57_CANONICAL_LEDGER_UNEXPECTEDLY_VISIBLE",
 "PAY54_B57_UNREVIEWED_WRITER_POLICY",
 "PAY54_B57_CANONICAL_EXECUTE_EXPOSED",
 "PAY54_B57_UNREVIEWED_EXECUTOR_DML","RESET ROLE"])
  assert.ok(sql.includes(x),x);
 const section=ci.indexOf("Apply and reverse reviewed wallet-v1 SQL only");
 const f=ci.indexOf("backend/db/release/wallet-read-v1-forward-review.sql",section);
 const testPos=ci.indexOf("backend/db/tests/batch57/001_canonical_writer_rls_compatibility.sql",section);
 const back=ci.indexOf("backend/db/release/wallet-read-v1-rollback-review.sql",section);
 assert.ok(section>0&&f>section&&testPos>f&&back>testPos);
 assert.ok(ci.includes('PAY54_FINANCIAL_EXECUTION: "false"'));
});
