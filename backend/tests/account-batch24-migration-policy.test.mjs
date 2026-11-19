"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import { inspectPay54IdentityMigrations as inspect,
 PAY54_BATCH24_MIGRATIONS as order }
 from "../governance/pay54-batch24-migration-policy.mjs";
const original=file=>readFileSync(new URL("../db/migrations/"+file,
 import.meta.url),"utf8");
test("956: 20 canonical SQL migrations preserve previously reviewed chain",()=>{
 const value=inspect();
 assert.equal(value.canonicalMigrationCount,20);
 assert.equal(value.assertionReceiptHasUniqueIssuerJti,true);
 assert.equal(value.initialBindingHasRowLockAndAudit,true);
 assert.equal(value.productionMigrationAuthorised,false);
 assert.deepEqual(order.slice(-2),[
  "019_identity_assertion_bootstrap.sql",
  "020_initial_account_binding.sql"
 ]);
});
test("956: duplicated account schema, blanket DML and weak roles deny",()=>{
 const bad=[
  "CREATE TABLE pay54.auth_sessions(id uuid);",
  "GRANT ALL ON pay54.auth_sessions TO PUBLIC;",
  "GRANT UPDATE ON pay54.ledger_entries TO pay54_session_issue_role;",
  "CREATE ROLE pay54_bad BYPASSRLS;",
  "SECURITY INVOKER"
 ];
 for(const snippet of bad)assert.throws(()=>inspect({
  readSource:file=>original(file)+"\n"+snippet
 }),/IDENTITY_MIGRATION_POLICY_DENIED/);
});
test("956: missing migration, missing atomic audit and removed ownership deny",()=>{
 assert.throws(()=>inspect({
  readSource:file=>file.startsWith("019")?"":original(file)
 }),/IDENTITY_MIGRATION_POLICY_DENIED/);
 assert.throws(()=>inspect({
  readSource:file=>file.startsWith("020")
   ?original(file).replace("INSERT INTO pay54.account_context_audit",
    "INSERT INTO pay54.other_table")
   :original(file)
 }),/IDENTITY_MIGRATION_POLICY_DENIED/);
});
