"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessBatch07Safety,loadBatch07SafetyInventory} from "../governance/account-batch07-safety.mjs";

test("Batch 07 source-boundary assertions remain source-only and deny deployment",()=>{
 const value=assessBatch07Safety(loadBatch07SafetyInventory());
 assert.equal(value.passed,true,JSON.stringify(value.checks));
 assert.equal(value.liveAttested,false);
 assert.equal(value.cloudProvisioning,"DISABLED");
 assert.equal(value.financialExecution,"DISABLED");
 assert.equal(value.stagingRelease,"BLOCKED");
});
test("unapproved RLS grants, GUC-based identity, role login and mutable transaction fail",()=>{
 const src=loadBatch07SafetyInventory();
 const attacks=[
  {migration:src.migration.replace("AS RESTRICTIVE","AS PERMISSIVE")},
  {migration:src.migration+"\nGRANT SELECT ON pay54.account_contexts TO pay54_account_reader_role;"},
  {migration:src.migration+"\ncurrent_setting('pay54.subject')"},
  {roles:src.roles.replace("  NOLOGIN NOINHERIT","  LOGIN NOINHERIT")},
  {transaction:src.transaction.replace("BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED READ ONLY","BEGIN")},
  {scope:src.scope.replace("assertTenantAccountAccess","allowAllAccounts")}
 ];
 for(const attack of attacks)assert.equal(
   assessBatch07Safety({...src,...attack}).passed,false,Object.keys(attack)[0]);
});
test("missing and invalid source inventories throw",()=>{
 assert.throws(()=>assessBatch07Safety(null),TypeError);
 assert.throws(()=>assessBatch07Safety({}),TypeError);
});
