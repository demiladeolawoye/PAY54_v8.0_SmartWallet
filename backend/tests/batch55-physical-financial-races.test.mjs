"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const setup=read("../db/tests/batch55/001_physical_financial_races_setup.sql");
const runner=read("../db/tests/batch55/002_physical_financial_revocation_races.sh");
const workflow=read("../../.github/workflows/pay54-batch22-postgres-rls-integration.yml");
test("committed fixtures are confined to a distinct synthetic schema",()=>{
 for(const s of ["pay54_disposable_ci","CREATE ROLE pay54_b55_writer NOLOGIN",
 "NOBYPASSRLS","CREATE SCHEMA pay54_b55",
 "CREATE FUNCTION pay54_b55.execute_synthetic_transfer",
 "SECURITY INVOKER","FOR UPDATE","CREATE POLICY b55_sessions",
 "FORCE ROW LEVEL SECURITY","COMMIT;"])assert.ok(setup.includes(s),s);
 assert.ok(!/GRANT\s+(?:INSERT|UPDATE|DELETE|SELECT)\s+ON\s+pay54\./i.test(setup));
 assert.equal(setup.includes("pay54.reserve_wallet_transfer("),false);
});
test("both real physical race orderings must observe lock contention",()=>{
 for(const s of ["wait_event_type='Lock'","PAY54_B55_WRITER_LOCK_HELD",
 "PAY54_B55_REVOKER_AFTER_WRITER","PAY54_B55_REVOKER_LOCK_HELD",
 "PAY54_B55_REVOKER_FIRST_COMMITTED","PAY54_B55_REVOKED_WRITER_DENIED",
 "PAY54_B55_REVOKED_POSTING_ACCEPTED","PAY54_B55_NO_REAL_LOCK_WAIT",
 "PAY54_B55_PASS"])assert.ok(runner.includes(s),s);
 assert.ok(runner.includes("SET LOCAL ROLE pay54_b55_writer"));
 assert.ok(runner.includes("BEGIN ISOLATION LEVEL READ COMMITTED"));
});
test("financial outbox journal and ledger invariants are checked after commit",()=>{
 for(const s of ["count(*) FROM pay54_b55.outbox",
 "idempotency_key='batch55-writer-first-0001'",
 "idempotency_key='batch55-revocation-first-0001'",
 "sum(amount_minor::numeric)","=7500","=2500",
 "DROP SCHEMA IF EXISTS pay54_b55 CASCADE",
 "REVOKE USAGE ON SCHEMA pay54 FROM pay54_b55_writer",
 "DROP ROLE IF EXISTS pay54_b55_writer"])
  assert.ok(runner.includes(s),s);
});
test("GitHub runner is disposable and cannot activate customer money",()=>{
 for(const s of [
 "backend/db/tests/batch55/002_physical_financial_revocation_races.sh",
 "PAY54_ENVIRONMENT: DISPOSABLE_CI",
 "PAY54_FINANCIAL_EXECUTION: \"false\"",
 "GITHUB_EVENT_NAME: pull_request"
 ])assert.ok(workflow.includes(s),s);
 for(const s of ["[[ \"$PAY54_ENVIRONMENT\" == DISPOSABLE_CI ]]",
 "[[ \"$PAY54_FINANCIAL_EXECUTION\" == false ]]"])assert.ok(runner.includes(s));
});
