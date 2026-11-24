"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {inspectWalletWriterRlsAdmission as inspect,FINANCIAL_RELATIONS} from "../governance/pay54-wallet-writer-rls-admission.mjs";
const forward=readFileSync(new URL("../db/release/wallet-read-v1-forward-review.sql",import.meta.url),"utf8");
const rollback=readFileSync(new URL("../db/release/wallet-read-v1-rollback-review.sql",import.meta.url),"utf8");
test("financial FORCE RLS exposes writer policy evidence gap",()=>{
 const r=inspect({forwardSql:forward,rollbackSql:rollback});
 assert.equal(r.relations.length,FINANCIAL_RELATIONS.length);
 assert.ok(r.relations.every(x=>x.forced&&x.enabled&&x.rollbackRestored));
 assert.ok(r.relations.every(x=>x.missingWritePolicies.length===3));
 assert.equal(r.databaseExecuted,false);
 assert.equal(r.stagingAuthorized,false);
});
test("missing rollback is blocked",()=>{
 const changed=rollback.replace("ALTER TABLE pay54.wallets DISABLE ROW LEVEL SECURITY;","");
 assert.ok(inspect({forwardSql:forward,rollbackSql:changed}).blockers.includes("ROLLBACK_RLS_NOT_RESTORED:wallets"));
});
test("missing restricted function is blocked",()=>{
 const changed=forward.replace("CREATE FUNCTION pay54.wallet_read_restricted_v1(","CREATE FUNCTION pay54.unapproved_reader(");
 assert.ok(inspect({forwardSql:changed,rollbackSql:rollback}).blockers.includes("RESTRICTED_READER_FUNCTION_MISSING"));
});
test("comments do not prove writer policies",()=>{
 const r=inspect({forwardSql:forward+"\n-- FOR INSERT TO all;",rollbackSql:rollback});
 assert.ok(r.blockers.includes("WRITER_POLICY_NOT_EVIDENCED:ledger_entries:INSERT"));
});
test("all source assessment results withhold release and spend",()=>{
 const r=inspect({forwardSql:forward,rollbackSql:rollback});
 for(const field of ["spendingAuthorized","persistentMigrationAuthorized","stagingAuthorized","productionAuthorized"])assert.equal(r[field],false);
 assert.ok(Object.isFrozen(r));
 assert.throws(()=>inspect(),/PAY54_B43_SQL_SOURCES_REQUIRED/);
});
